const miniKuwaharaFragmentShader = `
#define SECTOR_COUNT 4

uniform int radius;
uniform sampler2D inputBuffer;
uniform vec4 resolution;
uniform sampler2D originalTexture;

varying vec2 vUv;

vec3 getRGB(vec2 offset) {
    vec2 coord = (gl_FragCoord.xy + offset) / resolution.xy;
    return texture2D(inputBuffer, coord).rgb;
}

void getMeanAndVariance(vec2 offset, out vec3 mean, out float var) {
    // each sector defined by top-left corner and radius.
    vec3 X = vec3(0.0);
    vec3 squaredX = vec3(0.0);
    float n = 0.0;

    for (int y = int(offset[1]); y < int(offset[1]) + radius; y += 1) {
        for (int x = int(offset[0]); x < int(offset[0]) + radius; x += 1) {
            vec3 rgb = getRGB(vec2(x, y));
            X += rgb;
            squaredX += rgb * rgb;
            n += 1.0;
        }   
    }

    // Var(X) = E(X^2) - [E(X)]^2
    mean = X / n;
    var = dot((squaredX / n) - (mean * mean), vec3(1.0)) / 3.0;
}
    
void main() {
    vec3 sectorMeans[SECTOR_COUNT];
    float sectorVars[SECTOR_COUNT];
    // 0 1
    // 2 3 => sectors
    
    getMeanAndVariance(vec2(-radius, -radius), sectorMeans[0], sectorVars[0]);
    getMeanAndVariance(vec2(0, -radius), sectorMeans[1], sectorVars[1]);
    getMeanAndVariance(vec2(-radius, 0), sectorMeans[2], sectorVars[2]);
    getMeanAndVariance(vec2(0, 0), sectorMeans[3], sectorVars[3]);
    
    int minIdx = 0;
    for (int idx = 1; idx < SECTOR_COUNT; idx += 1) {
        if (sectorVars[idx] < sectorVars[minIdx]) {
            minIdx = idx;
        }
    }
    gl_FragColor = vec4(sectorMeans[minIdx], 1.0);
}
`;

export default miniKuwaharaFragmentShader;