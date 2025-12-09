#include <juce_core/juce_core.h>
#include <juce_events/juce_events.h>
#include "Engine.h"

int main (int argc, char* argv[])
{
    juce::ConsoleApplication app (argc, argv);

    DawnEngine engine;

    if (argc > 1)
    {
        juce::String path = argv[1]; // path to .vst3 file
        engine.scanAndLoadPlugin (path);
    }
    else
    {
        DBG ("No plugin path provided. Run: DawnEngine.exe \"C:/path/to/plugin.vst3\"");
    }

    // keep app running
    juce::Logger::writeToLog ("DawnEngine running. Press Ctrl+C to quit.");
    for (;;)
        juce::Thread::sleep (100);

    return 0;
}
