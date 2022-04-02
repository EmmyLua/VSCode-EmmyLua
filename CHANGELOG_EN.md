# Change Log

## 0.4.10

`FIX` fixes performance issues due to diagnostics being moved to daemon thread execution. Code hints and associated rendering are available immediately after code parsing

## 0.4.9

`FIX` fix the problem that the parsing is too slow under the default option, temporarily remove the deprecated related diagnosis

## 0.4.8

`NEW` unrecognized tags no longer warn

`NEW` experimentally supports a series of check configurations including `assignment safety check`, `subdomain existence check`, `undefined variable usage check`, `function parameter type safety`

`NEW` supports hint when class method overrides the function of the same name of the parent class

`NEW` other small details update

## 0.4.7

`FIX` jdk changed back to 8

## 0.4.6

`FIX` has many crashes due to changes in the compilation environment, and is now temporarily changed back 
## 0.4.4

The underline color of `NEW` upvalue can be configured. When the configuration content is empty, the underline will not be displayed.

`NEW` deprecated annotation is valid for global functions

`NEW` experimental support for subdomain existence check

`NEW` Use ctrl jump at definition to jump to usage 

## 0.4.3

`FIX` CodeLens error

## 0.4.2
`FIX` fix the bug that @private annotation does not work correctly

`NEW` supports @deprecated annotations and related diagnostics

`NEW` experimentally supports the string inline expression annotation `string<T>`. When the function parameter uses this annotation, the corresponding function call will prompt the field of the `T` class in the string, you can use string <_G> indicates the prompt global variable in the string 

## 0.4.1

`FIX` fix a crash caused by using fixPath

## 0.4.0

Resume update

Code hints:
* Support lua5.4 syntax
* Support to complete anonymous callback functions by marking the parameter type as a function
* Modify function signature display
* Support parameter type diagnosis (experimental)
* Support enumeration type annotation enum (experimental)

Code rendering:
* Support param hint
* Support local hint
* Support vararg hint
* Supports rendering of unused variables as gray
* upvalue modified to yellow underline


Code folding:
* Support for block folding via --region and --endregion
* Support continuous require statement folding, continuous require statements are recognized as import blocks, and require statements that open files can be directly folded through the relevant vscode settings

lua language:
* Remove the lua language definition configuration file and directly use the new built-in lua language definition of vscode

format:
* Remove the current formatting algorithm, the EmmyLua plugin no longer provides formatting algorithms
* Formatting is implemented by the plug-in EmmyLuaCodeStyle

debugging:
* Support conditional breakpoints, hit count breakpoints, logging points
* Support lua5.4 debugging
* Support debugging under Apple m1
* Additional debugging support specifying matching process name
* Debug provides debug inline variable
* Provide launch debugging on windows, launch debugging supports the use of windows terminal

JVM:
* Kotlin is modified to version 1.6, and gradle is modified to version 6.1.1
* jdk recommends using jdk11
* JVM parameter removed CMS using G1GC

BUG:
* Fix the problem of coloring error when typing code
* Fix the problem that the index is not refreshed immediately due to external updates
* Fix function signature error
* Rewrite the debugger to fix common crash issues 
