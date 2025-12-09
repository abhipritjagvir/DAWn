
#pragma once
#include <string>

namespace dawn {
  // Basic example API for future Electron/Node bridge
  struct AudioParams {
    int sampleRate{44100};
    int bufferSize{512};
  };

  std::string version();
  int sum(int a, int b);
}
