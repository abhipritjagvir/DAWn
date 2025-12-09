
# DAWn JUCE Native Bridge (Scaffold)

This is a minimal CMake project you can extend with JUCE.

## Steps
1. Add JUCE to the repo as a submodule:  
   `git submodule add https://github.com/juce-framework/JUCE JUCE`
2. In `CMakeLists.txt`, uncomment JUCE lines and link the modules you need.
3. Generate project:
```bash
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
```

Then integrate the built DLL/.so with your Electron app via `node-ffi-napi` or a native Node addon.
