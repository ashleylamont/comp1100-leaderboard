{-|
Module      : Othello
Description : Implementation of the Othello board game
Copyright   : (c) 2020 The Australian National University
License     : AllRightsReserved
-}
module Othello where

import           Data.Maybe (isJust)
import           Control.DeepSeq
import           GHC.Generics    (Generic)

-- | A `GameState` contains the current `Board` and the player who's turn it
-- is (`Nothing` if the game is over)
data GameState = GameState Bounds Turn Board
  deriving (Show, Eq, Ord)

-- | Whose turn is it?
getTurn :: GameState -> Turn
getTurn (GameState _ t _) = t

-- | Gets the current board from the GameState
getBoard :: GameState -> Board
getBoard (GameState _ _ b) = b

-- | Gets the size of the board in the GameState
getBounds :: GameState -> Bounds
getBounds (GameState b _ _) = b

-- | There are two players, 'Player1' and 'Player2'.
data Player = Player1 | Player2
  deriving (Show, Eq, Ord)

-- | It is either a player's turn, or the game is over.
data Turn = Turn Player | GameOver Outcome deriving (Show, Eq, Ord)

-- | The possible outcomes of a game
data Outcome = Draw | Winner Player deriving (Show, Eq, Ord)

-- | The Othello board is represented as a list of list of 'Maybe' 'Player'
-- where 'Nothing' is an empty square. It should contain 8 lists, each
-- containing 8 elements.
type Board = [[Maybe Player]]

-- | A Position is an (x, y) pair of coordinates representing a square
-- on a 'Board'.
type Position = (Int, Int)

-- | Represents the size of a board
type Bounds = (Int, Int)

-- | Return the opponent of a given player.
otherPlayer :: Player -> Player
otherPlayer Player1 = Player2
otherPlayer Player2 = Player1

-- | A datatype representing a move to be made
data Move = Move Position deriving (Eq, Show, Generic, NFData)

-- | The initial board for Othello.
initialBoard :: Bounds -> Board
initialBoard (bx, by) = map makeRow [0..by-1]
  where
    makeRow :: Int -> [Maybe Player]
    makeRow y = map (\x -> pieceOn (x, y)) [0..bx-1]

    pieceOn :: Position -> Maybe Player
    pieceOn pos
      | pos == (hx-1, hy-1) = Just Player2 
      | pos == (hx  , hy-1) = Just Player1
      | pos == (hx-1, hy  ) = Just Player1
      | pos == (hx  , hy  ) = Just Player2
      | otherwise = Nothing

    hx = bx `div` 2
    hy = by `div` 2

-- | The initial game state for Othello. The input bounds define the size of
-- the gameboard. These should both be even numbers.
-- A standard game of othello has bounds = (8,8)
initialState :: Bounds -> GameState
initialState bounds = GameState bounds (Turn Player1) (initialBoard bounds)

-- | A list of every possible position on the board.
-- [(0,0), (1,0), (2,0), ... (5,7), (6,7), (7,7)]
allPositions :: GameState -> [Position]
allPositions (GameState (bx, by) _ _) = [ (x, y) | y <- [0..by-1], x <- [0..bx-1]]

-- | Find the piece at the given position.
--
-- Note that this function is 'unsafe' in that it will produce an
-- error if the position is outside the board or the board is malformed.
pieceAt :: GameState -> Position -> Maybe Player
pieceAt (GameState bounds _ board) pos@(x, y)
  | outOfBounds bounds pos = boundsError pos "pieceAt"
  | otherwise = case drop y board of
      [] -> error "pieceAt: Malformed Board"
      row:_ -> case drop x row of
        [] -> error "pieceAt: Malformed Board"
        piece:_ -> piece

-- | Calculate the current score for a player on a board.
currentScore :: Board -> Player -> Int
currentScore board piece = 
  length [p | Just p <- concat board, p == piece]

-- | Gets the score for each player on a given board
countPieces :: Board -> (Int, Int)
countPieces board = 
  (currentScore board Player1, currentScore board Player2)

-- | Returns the list of all possible next moves for a give GameState
--
-- If the game is not complete you may assume that the list is non-empty
legalMoves :: GameState -> [Move]
legalMoves gameState = 
  filter (legalMove gameState) 
  $ map Move $ allPositions gameState

-- | Check if a move is legal for a player on a board.
--
-- A move is legal if and only if the game is not over, the position is not
-- already occupied and if placing a stone captures at least one stone from 
-- the other player.
legalMove :: GameState -> Move -> Bool
legalMove gs@(GameState bounds turn board) mv@(Move pos)
  | outOfBounds bounds pos = boundsError pos "legalMove"
  | isJust (pieceAt gs pos) = False
  | otherwise = case turn of
    GameOver _ -> False
    Turn player -> currentScore board player + 1 <
      currentScore (playMove bounds board player mv) player

-- | Make a move as the current player in the game. Returns `Nothing`
-- if the move was an illegal move, otherwise returns the resulting state once
-- the move has been played.
applyMove :: GameState -> Move -> Maybe GameState
applyMove (GameState _ (GameOver _) _) _ = Nothing
applyMove gs@(GameState bounds (Turn player) board) move
  | legalMove gs move = Just (GameState bounds nextPlayer newBoard)
  | otherwise = Nothing
  where
    newBoard = playMove bounds board player move

    -- If after this move, the opponent has at least one legal move
    -- then it's their turn. Otherwise, if the current player has a
    -- legal move, it stays their turn. If no-one has a legal move
    -- the game is over.
    nextPlayer
      | any 
        (legalMove (GameState bounds (Turn $ otherPlayer player) newBoard) . Move) 
        (allPositions gs)
        = Turn (otherPlayer player)
      | any (legalMove (GameState bounds (Turn player) newBoard). Move) (allPositions gs)
        = Turn player
      | otherwise = GameOver result
        where
            (p1Score, p2Score) = countPieces newBoard
            result
                | p1Score > p2Score = Winner Player1
                | p1Score < p2Score = Winner Player2
                | otherwise = Draw

-- | Print the board in a human-readable format. It won't work as desired
-- directly inside of GHCi. To use it, try
-- > putStrLn (ppBoard yourBoard)
ppGameState :: GameState -> String
ppGameState (GameState _ turn board) = unlines [show turn, boardString]
  where
    boardString :: String
    boardString = 
      unlines (
      [ unwords (show n : map pieceToString row)
      | (n,row) <- zip [0 :: Int ..] board]
      ++ [unwords (map return (' ':['A'..'H']))
      ])
      where
        pieceToString Nothing = " "
        pieceToString (Just Player1) = "X"
        pieceToString (Just Player2) = "O"

{- Functions below are helper functions which implement the game.
  You can read through them if you're interested but probably won't need 
  to use them.
-}

-- | Play a move as the player given. It does not check if the move is legal.
-- This is only really a helper function to applyMove.
playMove :: Bounds -> Board -> Player -> Move -> Board
playMove bounds board player (Move pos)
  | outOfBounds bounds pos = boundsError pos "playMove"
  | otherwise = changeTo bounds player (pos:changedPieces) board
  where
    changedPieces = concatMap
      -- Step once so we're not on our starting square
      (\step -> collectPieces bounds (step pos) board isOpponent isUs step dropList)
      directions

    -- The eight different directions, as step functions
    directions = [ \(x, y) -> (x - 1, y - 1)
                 , \(x, y) -> (x - 1, y)
                 , \(x, y) -> (x - 1, y + 1)
                 , \(x, y) -> (x, y - 1)
                 , \(x, y) -> (x, y)
                 , \(x, y) -> (x, y + 1)
                 , \(x, y) -> (x + 1, y - 1)
                 , \(x, y) -> (x + 1, y)
                 , \(x, y) -> (x + 1, y + 1)
                 ]

    -- Collect up any opponent pieces
    isOpponent (Just p) = player == otherPlayer p
    isOpponent _ = False

    -- Stop when we see another of our pieces
    isUs (Just p) = player == p
    isUs _ = False

    -- If we walk off the edge, collect nothing
    dropList _ = []

-- | Replace the piece at the given position with the provied piece.
-- Note that this function is 'unsafe' in that it will produce an
-- error if the position is outside the board or the board is malformed.
update :: Bounds -> Position -> Maybe Player -> Board -> Board
update bounds pos@(x, y) piece board
  | outOfBounds bounds pos = boundsError pos "update"
  | otherwise = updateRow y board
  where
    updateRow _ [] = error "update:updateRow: Index error"
    updateRow 0 (row:rows) = updateCol x row:rows
    updateRow n (row:rows) = row : updateRow (n-1) rows
    updateCol _ [] = error "update:updateCol: Index error"
    updateCol 0 (_:cols) = piece:cols
    updateCol n (col:cols) = col : updateCol (n-1) cols

-- | Change the positions given on the board to being owned by the player.
changeTo :: Bounds -> Player -> [Position] -> Board -> Board
changeTo _ _ [] board = board
changeTo bounds p (pos:poss) board = changeTo bounds p poss (update bounds pos (Just p) board)

-- | Build a list of coords from the board, starting at the position
-- given. Mostly used to collect pieces to change after a move was made.
collectPieces
  :: Bounds -- ^ The bounds of the provided board
  -> Position -- ^ Starting position
  -> Board -- ^ Board to walk over
  -> (Maybe Player -> Bool) -- ^ Do we include this cell in the result?
  -> (Maybe Player -> Bool) -- ^ Should we stop?
  -> (Position -> Position) -- ^ Step (return the next position to check)
  -> ([Position] -> [Position])
     -- ^ What to do with collected results, if we walked off the edge
  -> [Position]
collectPieces bounds position board keepTaking stopTaking nextPos edgeFunction =
  go position []
  where
    go pos pieces
      | outOfBounds bounds pos = edgeFunction pieces
      | keepTaking currentPiece = go (nextPos pos) (pos:pieces)
      | stopTaking currentPiece = pieces
      | otherwise = []
      where
        currentPiece = getPiece pos

    getPiece (x, y) = board !! y !! x

-- | Are the coords given out of bounds?
outOfBounds :: Bounds -> Position -> Bool
outOfBounds (bx, by) (x, y) = x < 0 || x >= bx || y < 0 || y >= by

-- | Throw an error for a position out of bounds, with the coordinate
-- and string given.
boundsError :: Position -> String -> a
boundsError (x, y) callee =
  error (concat [ callee, ": Invalid bounds (x=", show x
                , ") (y=", show y, ")"
                ])