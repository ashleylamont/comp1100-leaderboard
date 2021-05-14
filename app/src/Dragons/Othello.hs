{-# OPTIONS_GHC -Wno-orphans #-}

{-# LANGUAGE LambdaCase        #-}
{-# LANGUAGE OverloadedStrings #-}

{-|
Module      : Dragons.Othello
Description : Othello-specific things students don't need to see
Copyright   : (c) 2020 The Australian National University
License     : AllRightsReserved

This module collects functions and instances for Othello-specific data
structures (so they don't belong in the generic game framework), but
are also implementation details that students don't need to concern
themselves with.
-}
module Dragons.Othello where

import AI
import Othello
import Data.Aeson
import Dragons.Game

toAITable :: [(String, AIFunc)] -> [(String, GenericAIFunc GameState Move)]
toAITable = (fmap . fmap) toGenericAIFunc
  where
    toGenericAIFunc :: AIFunc -> GenericAIFunc GameState Move
    toGenericAIFunc aiFunc st = case aiFunc of
      NoLookahead f -> [f st]
      WithLookahead f -> map (f st) [1..]

rules1100 :: GameRules GameState Move
rules1100 = GameRules
  { gameInitialState = initialState (8,8)
  , gameGetTurn = getTurn
  , gameApplyMove = flip applyMove
  }

-- How to turn move types to and from JSON. Best practice is
-- to define instances next to either the data type or the
-- typeclass. These are "orphan" instances, and normally poor
-- practice, but we don't want to have too much mysterious code in
-- files that students need to read.

instance FromJSON Move where
  parseJSON = withObject "move" $ \o -> Move
    <$> o .: "pos"

instance ToJSON Move where
  toJSON (Move pos) = object
    [ "pos" .= pos
    ]

instance ToJSON GameState where
  toJSON (GameState _ turn board) = object
    [ "turn" .= turn
    , "board" .= jsonBoard board
    ]
    where
      jsonBoard :: Board -> Value
      jsonBoard = String . (foldMap . foldMap) (\case
        Just Player1 -> "1"
        Just Player2 -> "2"
        Nothing -> " ")
