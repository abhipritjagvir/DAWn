#include "Engine.h"
#include <cstring> // for std::memcpy

DawnEngine::DawnEngine()
{
    // Ask for mic permission on some OS (safe to ignore if not needed)
    juce::RuntimePermissions::request (juce::RuntimePermissions::recordAudio,
        [] (bool) {});

    // Set up audio device
    juce::AudioDeviceManager::AudioDeviceSetup setup;
    deviceManager.getAudioDeviceSetup (setup);

    setup.bufferSize = 512;
    setup.sampleRate = 44100.0;

    // 0 input channels, 2 output channels
    deviceManager.initialise (0, 2, nullptr, true, {}, &setup);
    deviceManager.addAudioCallback (this);
}

DawnEngine::~DawnEngine()
{
    deviceManager.removeAudioCallback (this);
    if (plugin)
        plugin->releaseResources();
    plugin.reset();
}

void DawnEngine::audioDeviceAboutToStart (juce::AudioIODevice* device)
{
    const double sr = device->getCurrentSampleRate();
    const int blockSize = device->getCurrentBufferSizeSamples();

    tempBuffer.setSize (2, blockSize);
    tempBuffer.clear();

    if (plugin)
        plugin->prepareToPlay (sr, blockSize);
}

void DawnEngine::audioDeviceStopped()
{
    if (plugin)
        plugin->releaseResources();
}

void DawnEngine::audioDeviceIOCallbackWithContext (const float* const* /*inputChannelData*/,
                                                   int /*numInputChannels*/,
                                                   float* const* outputChannelData,
                                                   int numOutputChannels,
                                                   int numSamples,
                                                   const juce::AudioIODeviceCallbackContext& /*context*/)
{
    if (! plugin)
    {
        // No plugin loaded → output silence
        for (int ch = 0; ch < numOutputChannels; ++ch)
            if (outputChannelData[ch] != nullptr)
                juce::FloatVectorOperations::clear (outputChannelData[ch], numSamples);
        return;
    }

    tempBuffer.setSize (plugin->getTotalNumOutputChannels(), numSamples, false, false, true);
    tempBuffer.clear();

    juce::MidiBuffer midi; // later you’ll feed notes from DAWn here
    plugin->processBlock (tempBuffer, midi);

    for (int ch = 0; ch < numOutputChannels; ++ch)
    {
        float* out = outputChannelData[ch];
        if (out == nullptr) continue;

        const int srcChan = juce::jmin (ch, tempBuffer.getNumChannels() - 1);
        const float* src = tempBuffer.getReadPointer (srcChan);

        std::memcpy (out, src, sizeof(float) * (size_t) numSamples);
    }
}




bool DawnEngine::scanAndLoadPlugin (const juce::String& pathToVST3)
{
    plugin.reset();

   #if JUCE_PLUGINHOST_VST3
    juce::VST3PluginFormat format;

    juce::PluginDescription desc;
    desc.pluginFormatName = format.getName();
    desc.fileOrIdentifier = pathToVST3;

    juce::String error;
    std::unique_ptr<juce::AudioPluginInstance> instance (
        format.createInstanceFromDescription (desc, 44100.0, 512, error));

    if (instance == nullptr)
    {
        DBG ("Could not load plugin: " << error);
        return false;
    }

    plugin = std::move (instance);

    if (auto* device = deviceManager.getCurrentAudioDevice())
        audioDeviceAboutToStart (device);

    DBG ("Loaded plugin: " << plugin->getName());
    return true;
   #else
    juce::ignoreUnused (pathToVST3);
    DBG ("JUCE_PLUGINHOST_VST3 is not enabled in JUCE config.");
    return false;
   #endif
}

void DawnEngine::setPluginParameter (int paramIndex, float value)
{
    if (! plugin) return;
    if (paramIndex < 0 || paramIndex >= plugin->getParameters().size()) return;

    plugin->getParameters()[paramIndex]->setValueNotifyingHost (value);
}

int DawnEngine::getNumParameters() const
{
    return plugin ? plugin->getParameters().size() : 0;
}
