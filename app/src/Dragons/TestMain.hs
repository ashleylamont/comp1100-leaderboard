module Dragons.TestMain where

import AITests
import OthelloTests
import Testing

allTests :: Test
allTests = TestGroup "All Tests"
  [ othelloTests
  , aiTests
  ]

testMain :: IO ()
testMain = runTests allTests
