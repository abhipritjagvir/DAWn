cmake_minimum_required(VERSION 3.16)
project(DawnEngine VERSION 0.1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 👉 change this to your JUCE path
set(JUCE_DIR "${CMAKE_CURRENT_LIST_DIR}/../JUCE" CACHE PATH "Path to JUCE")

add_subdirectory(${JUCE_DIR} JUCE)

add_executable(DawnEngine
    Source/Main.cpp
    Source/Engine.cpp
    Source/Engine.h
)

target_compile_definitions(DawnEngine
    PRIVATE
    JUCE_APPLICATION_NAME_STRING="$<TARGET_FILE_NAME:DawnEngine>"
    JUCE_APPLICATION_VERSION_STRING="${PROJECT_VERSION}"
)

target_link_libraries(DawnEngine
    PRIVATE
      juce::juce_core
      juce::juce_events
      juce::juce_audio_basics
      juce::juce_audio_devices
      juce::juce_audio_processors
      juce::juce_audio_formats
      juce::juce_audio_utils
)
