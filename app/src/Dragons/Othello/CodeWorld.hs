{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE MultiWayIf #-}

{-|
Module      : Dragons.Othello.Codeworld
Description : CodeWorld interface for the Othello game
Copyright   : (c) 2020 The Australian National University
License     : AllRightsReserved
-}
module Dragons.Othello.CodeWorld where

import           Othello hiding (update)
import           CodeWorld
import           Data.Text (Text)
import qualified Data.Text as T
import           Dragons.Othello ()
import           Dragons.Game
import           Dragons.Game.UI.CodeWorld as UI

-- | Our UI-specific state.
data UIModel
  = Idle
    -- ^ Waiting for something interesting to happen (AI move, network
    -- move, etc.).
  | InputMove
    -- ^ Player needs to choose a square to place a piece.
  deriving (Eq, Show)

-- | Most events CodeWorld sends to us are uninteresting, so we parse
-- down into this structure.
data SimpleEvent
  = ClickLocation Position
  deriving (Eq, Show)

codeWorldUI :: GameConfig GameState Move -> IO (GameUI GameState Move)
codeWorldUI config = UI.codeWorldUI config $ CodeWorldUI
  { cwInitialModel = Idle
  , cwView = view
  , cwUpdate = update
  }

-- | Render the whole scene as a 'Picture'.
view :: UIMode Move -> GameState -> UIModel -> Picture
view mode st model = pictures
  [ drawModeText mode
  , drawModelText model
  , drawScore st
  , drawHighlights model st
  , drawBoard st
  ]

-- | Describe the 'UIMode', which is what the framework is currently
-- doing, or what it is asking of the user.
drawModeText :: UIMode Move -> Picture
drawModeText mode = translated (-5) 9 . scaled 0.5 0.5 . lettering $ case mode of
  Started -> "Initialising"
  AwaitingMove p _ _ -> pieceName p <> " to move"
  AIThinking p name -> pieceName p <> " (" <> T.pack name <> ") is thinking"
  AIFailedToMove p name -> pieceName p <> " (" <> T.pack name <> ") failed to move"
  AIIllegalMove p name -> pieceName p <> " (" <> T.pack name <> ") made an illegal move"
  NetworkIllegalMove p -> pieceName p <> " (network) made an illegal move"
  Finished o _ -> "Game over. " <> case o of
    Winner p -> pieceName p <> " wins!"
    Draw -> "It's a draw!"

-- | Additional labels from the 'UIModel', which tracks exactly what
-- we're asking of the player as he or she builds up a move.
drawModelText :: UIModel -> Picture
drawModelText model = translated (-5) 8.5 . scaled 0.5 0.5 $ case model of
  Idle -> blank
  InputMove -> lettering "Click a square to place a piece"

-- | Show current scores (number of pieces controlled by each player).
drawScore :: GameState -> Picture
drawScore st
  = translated 5 9 (scaled 0.5 0.5 (lettering p1))
  & translated 5 8.5 (scaled 0.5 0.5 (lettering p2))
  where
    p1 = "Dark: " <> T.pack (show p1count)
    p2 = "Light: " <> T.pack (show p2count)
    (p1count, p2count) = countPieces (getBoard st)

-- | Draw highlights (which squares can be selected).
drawHighlights :: UIModel -> GameState -> Picture
drawHighlights _ st = 
  centreGrid st $ 
  foldMap (highlight . (\(Move p) -> p)) $ 
  legalMoves st
  where
    highlight :: Position -> Picture
    highlight (x, y) = translated (0.5 + fromIntegral x) (0.5 + fromIntegral y)
      $ colored (s green) (solidRectangle 0.98 0.98)
    s = case getTurn st of 
      Turn Player1 -> dark 
      Turn Player2 -> light 
      _ -> id


-- | Draw the board and all its pieces to the centre of the screen.
drawBoard :: GameState -> Picture
drawBoard st = centreGrid st $
  pictures (zipWith draw (concat (getBoard st)) (allPositions st))
  where
    draw :: Maybe Player -> Position -> Picture
    draw sq (x, y)
      = translated (fromIntegral x) (fromIntegral y) (drawSquare sq)

-- | Draw a board square in a square 1.0 units each side.
-- The square should go from (0,0) to (1,1), this makes later transformations
-- much simpler
drawSquare :: Maybe Player -> Picture
drawSquare sq = translated 0.5 0.5 $ (
  case sq of
    Nothing -> blank
    Just Player1 -> coloured black (solidCircle 0.4)
    Just Player2 -> coloured white (solidCircle 0.4)
  ) & rectangle 1 1 & coloured (dull green) (solidRectangle 1 1)
                 
-- | Labels for pieces that match how we draw them.
pieceName :: Player -> Text
pieceName = player "Dark" "Light"

-- | Translate the grid into the centre of the screen.
centreGrid :: GameState -> Picture -> Picture
centreGrid st = scaled s (-s) . uncurry translated t
  where
    t = calculateTranslate st
    s = calculateScale st

-- | Calculates a scale factor to make the board bigger and keep it on the screen
calculateScale :: GameState -> Double
calculateScale st = min (maxSide / bx') (maxSide / by')
  where
    (bx, by) = getBounds st
    (bx', by') = (fromIntegral bx, fromIntegral by)
    maxSide = 16 :: Double -- magic number to keep the board on the screen

-- | Calculates the translation to move the board to the centre of the screen
calculateTranslate :: GameState -> (Double, Double)
calculateTranslate st = (-w'/2, -h'/2)
  where
    (w, h) = getBounds st
    (w', h') = (fromIntegral w, fromIntegral h)

-- | This is like the update function given to CodeWorld's
-- 'activityOf' function, but we take additional arguments for the
-- game state and 'UIMode', and return additional information to the
-- framework when we have a completed move.
update
  :: UIMode Move
  -> GameState
  -> UIModel
  -> Event
  -> (UIModel, Maybe (UIResponse Move))
update mode st model ev = case mode of
  Started -> idle
  Finished _ quit -> (Idle, Just quit)
  AIThinking _ _ -> idle
  AIFailedToMove _ _ -> idle
  AIIllegalMove _ _ -> idle
  NetworkIllegalMove _ -> idle
  AwaitingMove _ _ respond -> case model of
    Idle -> (InputMove, Nothing)
    InputMove -> withSimpleEvent $ \(ClickLocation pos) -> if
      | Move pos `elem` legalMoves st -> (Idle, Just . respond $ Move pos)
      | otherwise -> (InputMove, Nothing)

  where
    -- Parse CodeWorld event into SimpleEvent if possible.
    simpleEvent :: Maybe SimpleEvent
    simpleEvent = case ev of
      PointerPress p -> ClickLocation <$> gridPoint st p
      _ -> Nothing

    -- If the current event parses to a SimpleEvent, feed it to the
    -- function. Otherwise do nothing.
    withSimpleEvent
      :: (SimpleEvent -> (UIModel, Maybe (UIResponse Move)))
      -> (UIModel, Maybe (UIResponse Move))
    withSimpleEvent f = maybe ignore f simpleEvent

    idle = (Idle, Nothing)
    ignore = (model, Nothing)

-- | Convert a 'Point' in screen space into a 'Location' on the game
-- board, if that makes sense.
gridPoint :: GameState -> Point -> Maybe Position
gridPoint st (px, py)
  | outOfBounds (getBounds st) pos = Nothing
  | otherwise = Just pos
  where
    (tx, ty) = calculateTranslate st
    scl = calculateScale st
    pos = (floor (px/scl - tx), floor (py/(-scl) - ty))

