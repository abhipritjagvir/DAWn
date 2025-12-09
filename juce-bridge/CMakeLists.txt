
cmake_minimum_required(VERSION 3.22)
project(DAWnNativeBridge VERSION 0.1.0)

# Set to your JUCE path or add as submodule and use add_subdirectory(JUCE)
# set(JUCE_DIR "${CMAKE_SOURCE_DIR}/JUCE")
# add_subdirectory(${JUCE_DIR})

add_library(dawn_bridge SHARED
    src/Bridge.cpp
)

target_include_directories(dawn_bridge PRIVATE include)

# Example: link JUCE modules here when added
# target_link_libraries(dawn_bridge PRIVATE juce::juce_audio_basics juce::juce_audio_devices)
