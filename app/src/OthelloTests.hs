{-|
Module      : OthelloTests
Description : Tests for the Othello game
Copyright   : (c) 2020 The Australian National University
License     : AllRightsReserved
-}
module OthelloTests where

import           Othello
import           Data.Aeson
import           Dragons.Othello      ()
import           Dragons.Othello.Text
import           Testing
import           Data.Maybe (isJust)

othelloTests :: Test
othelloTests = TestGroup "Othello" 
    [ initialStateTests
    , allPositionsTest
    , pieceAtTests
    , legalMovesTests
    , applyMoveTests
    , jsonTests
    , moveParsingTests
    ]

initialStateTests :: Test
initialStateTests = TestGroup "initialState"
    [ Test "correct normal board"
        (assertEqual (getBoard initialStateBig) initialBoardBig)
    , Test "correct small board"
        (assertEqual (getBoard initialStateSmall) initialBoardSmall)
    ]

allPositionsTest :: Test
allPositionsTest = Test "allPositions"
    (assertEqual (allPositions initialStateSmall)
    [(0,0),(1,0),(2,0),(3,0)
    ,(0,1),(1,1),(2,1),(3,1)
    ,(0,2),(1,2),(2,2),(3,2)
    ,(0,3),(1,3),(2,3),(3,3)])

pieceAtTests :: Test
pieceAtTests = TestGroup "pieceAt"
    [ Test "top left" (assertEqual (pieceAt testState1 (0,0)) (Just Player2))
    , Test "top right" (assertEqual (pieceAt testState1 (7,0)) (Just Player2))
    , Test "bottom left" (assertEqual (pieceAt testState1 (0,7)) (Just Player1))
    , Test "bottom right" (assertEqual (pieceAt testState1 (7,7)) (Just Player1))
    ]

countPiecesTest :: Test
countPiecesTest = Test "countPieces"
    (assertEqual (countPieces (getBoard testState2)) (13, 51))

legalMovesTests :: Test
legalMovesTests = TestGroup "legalMoves"
    [ Test "on initialState" 
        (assertEqual (legalMoves initialStateBig)
            [ Move (3, 2)
            , Move (2, 3)
            , Move (5, 4)
            , Move (4, 5)
            ])
    , Test "on finished game"
        (assertEqual (legalMoves testState2) [])
    ]

applyMoveTests :: Test
applyMoveTests = TestGroup "applyMoves"
    [ Test "initialState all positions"
        (assertEqual 
            (map (isJust . applyMove initialStateBig) mvs) 
            (map (flip elem (legalMoves initialStateBig)) mvs))
    , Test "test piece flipping"
        (assertEqual
            (applyMove testState3 (Move (3, 3)))
            (Just testState3'))
    ]
    where mvs = [Move (x, y) | y <- [0..7], x <- [0..7]]

jsonTests :: Test
jsonTests = TestGroup "JSON encode/decode"
  [ Test "simple encode/decode of Move"
      (assertEqual (decode . encode <$> mvs) (Just <$> mvs))
  ]
  where mvs = [Move (x, y) | y <- [0..7], x <- [0..7]]

moveParsingTests :: Test
moveParsingTests = TestGroup "move parsing/unparsing"
  [ Test "reading roundtrip"
      (assertEqual (renderMove <$> parseMove st "F4") (Just "F4"))
  , Test "printing roundtrip"
      (assertEqual
        (parseMove st (renderMove (Move (5, 4))))
        (Just (Move (5, 4))))
  ]
  where st = initialState (8, 8)


-- Helper functions and test game states

readBoard :: [String] -> Board
readBoard = map (map charToSquare)
    where
        charToSquare 'X' = Just Player1
        charToSquare 'O' = Just Player2
        charToSquare  _  = Nothing

initialStateBig :: GameState
initialStateBig = initialState (8,8)

initialStateSmall :: GameState
initialStateSmall = initialState (4,4)

initialBoardBig :: Board
initialBoardBig = readBoard
    ["........"
    ,"........"
    ,"........"
    ,"...OX..."
    ,"...XO..."
    ,"........"
    ,"........"
    ,"........"]

initialBoardSmall :: Board
initialBoardSmall = readBoard
    ["...."
    ,".OX."
    ,".XO."
    ,"...."]

testState1 :: GameState
testState1 = GameState (8,8) (Turn Player2) board
    where
        board = readBoard boardString
        boardString = 
            ["O......O"
            ,"........"
            ,"........"
            ,"...OX..."
            ,"...XO..."
            ,"........"
            ,"........"
            ,"X......X"]

testState2 :: GameState
testState2 = GameState (8,8) (GameOver (Winner Player2)) board
    where
        board = readBoard boardString
        boardString = 
            [".XXXXXXX"
            ,".OOOOO.X"
            ,"OOOOOOOX"
            ,"OOOOOOOX"
            ,"OOOOOOOX"
            ,"OOOOOOOX"
            ,"OOOOOOOX"
            ,".OOOOO.."]

testState3 :: GameState
testState3 = GameState (8,8) (Turn Player1) board
    where
        board = readBoard boardString
        boardString = 
            ["X..X...."
            ,".O.O...."
            ,"..OO...."
            ,"....OOOX"
            ,"..O....."
            ,".O......"
            ,"X......."
            ,".......O"]

testState3' :: GameState
testState3' = GameState (8,8) (GameOver (Winner Player1)) board
    where
        board = readBoard boardString
        boardString = 
            ["X..X...."
            ,".X.X...."
            ,"..XX...."
            ,"...XXXXX"
            ,"..X....."
            ,".X......"
            ,"X......."
            ,".......O"]
