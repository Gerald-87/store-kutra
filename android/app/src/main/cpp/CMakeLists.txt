cmake_minimum_required(VERSION 3.18.1)

# Configure C++ standard and features
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Set C++ flags
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++17 -frtti -fexceptions")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DANDROID_STL=c++_shared")

# Enable verbose makefile for debugging
set(CMAKE_VERBOSE_MAKEFILE ON)

# Link against the C++ standard library
find_library(log-lib log)
find_library(android-lib android)

# Configure STL
set(CMAKE_ANDROID_STL_TYPE c++_shared)

# Find required libraries
find_library(
    log-lib
    log
)

# Create a dummy library to satisfy CMake requirements
add_library(
    kutra-native
    SHARED
    kutra-native.cpp
)

# Link libraries
target_link_libraries(
    kutra-native
    ${log-lib}
    ${android-lib}
    c++_shared
)

# Set properties
set_target_properties(kutra-native PROPERTIES
    CXX_STANDARD 17
    CXX_STANDARD_REQUIRED ON
    CXX_EXTENSIONS OFF
)