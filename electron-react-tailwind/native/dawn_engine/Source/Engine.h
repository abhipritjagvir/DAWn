#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_devices/juce_audio_devices.h>

class DawnEngine : public juce::AudioIODeviceCallback
{
public:
    DawnEngine();
    ~DawnEngine() override;

    void audioDeviceIOCallbackWithContext (const float* const* inputChannelData,
                                           int numInputChannels,
                                           float* const* outputChannelData,
                                           int numOutputChannels,
                                           int numSamples,
                                           const juce::AudioIODeviceCallbackContext& context) override;

    void audioDeviceAboutToStart (juce::AudioIODevice* device) override;
    void audioDeviceStopped () override;

    // --- Plugin control API ---
    bool scanAndLoadPlugin (const juce::String& pathToVST3);
    void setPluginParameter (int paramIndex, float value);
    int  getNumParameters () const;

private:
    juce::AudioDeviceManager deviceManager;
    std::unique_ptr<juce::AudioPluginInstance> plugin;
    juce::AudioBuffer<float> tempBuffer;
};
