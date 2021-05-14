{-|
Module      : Dragons.Othello.Text
Description : Text interface for the Othello game
Copyright   : (c) 2020 The Australian National University
License     : AllRightsReserved
-}
module Dragons.Othello.Text where

import Othello
import Data.Char
import Data.Maybe
import Dragons.Othello ()
import Dragons.Game
import Dragons.Game.UI.Text as UI

textUI :: GameConfig GameState Move -> GameUI GameState Move
textUI config = UI.textUI config $ TextUI
  { textRenderState = renderState
  , textReadMove = readMove
  }

renderState :: GameState -> String
renderState gameState = unlines $ catMaybes
  [ renderTurn $ getTurn gameState
  , Just $ renderBoard gameState
  ]

renderTurn :: Turn -> Maybe String
renderTurn t = case t of
  Turn Player1 -> Just "Player 1 (X) to move"
  Turn Player2 -> Just "Player 2 (O) to move"
  GameOver _ -> Nothing

renderBoard :: GameState -> String
renderBoard st = 
  unlines (
    [ unwords (show n : map pieceToString row)
    | (n,row) <- zipWith 
      (\y -> (,) y . (map (\(x, s) -> ((x, y), s)))) 
      [0 :: Int ..] $ map (zip [0 :: Int ..]) $ getBoard st]
    ++ [unwords (map return (' ':['A'..'H']))
    ])
    where
      pieceToString (pos, Nothing) | legalMove st (Move pos) = "?"
                                    | otherwise = " "
      pieceToString (_, Just Player1) = "X"
      pieceToString (_, Just Player2) = "O"

     
-- | Ask for a move, check that it's sensible, and if it isn't, ask again.
readMove :: GameState -> Maybe (Player, Move) -> IO Move
readMove st _ = loop
  where
    loop = do
      putStrLn $ "Enter a move. Example: " ++ renderMove (head (legalMoves st))
      line <- getLine
      case parseMove st line of
        Nothing -> errLoop "Malformed move, try again."
        Just mv
          | mv `elem` legalMoves st -> pure mv
          | otherwise -> errLoop "Not a valid move."

    errLoop s = putStrLn s *> loop

-- | Parse a 'String' that should describe a 'Move', if it makes sense
-- for where we are in the current game.
parseMove :: GameState -> String -> Maybe Move
parseMove _ s = case map toUpper s of
  [ix, iy] -> case (fromFile ix, fromRank iy) of
    (Just x, Just y) -> Just (Move (x, y))
    _ -> Nothing
    where
      fromFile f
        | x >= 0 && x < 8 = Just x
        | otherwise = Nothing
        where
          x = ord f - ord 'A'

      fromRank r
        | y >= 0 && y < 8 = Just y
        | otherwise = Nothing
        where
          y = ord r - ord '0'
  _ -> Nothing


renderMove :: Move -> String
renderMove (Move (x, y))
  = [toFile x, toRank y]
  where
    toRank n = ['0'..'9'] !! n
    toFile n = ['A'..'Z'] !! n


