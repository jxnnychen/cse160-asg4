// Vertex shader program
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec4 a_Normal;
  varying vec2 v_UV;
  varying vec4 v_Normal;
  varying vec3 v_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = a_Normal;
    v_Position = vec3(u_ModelMatrix * a_Position);
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec4 v_Normal;
  varying vec3 v_Position;
  uniform vec4 u_FragColor;
  uniform vec3 u_LightPosition;
  uniform vec3 u_LightColor;
  uniform vec3 u_SpotlightPosition;
  uniform vec3 u_SpotlightDirection;
  uniform vec3 u_SpotlightColor;
  uniform float u_SpotlightCutoff;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  uniform sampler2D u_Sampler4;
  uniform sampler2D u_Sampler5;
  uniform bool u_ShowNormals;
  uniform bool u_UseLighting;
  uniform int u_whichTexture;

  void main() {
    if (u_ShowNormals) {
      gl_FragColor = vec4(normalize(v_Normal.xyz), 1.0);
    } else {
      vec4 baseColor;
      if (u_whichTexture == -2) {
        baseColor = u_FragColor;
      } else if (u_whichTexture == -1) {
        baseColor = vec4(v_UV,1.0,1.0);
      } else if (u_whichTexture == 0) {
        baseColor = texture2D(u_Sampler0, v_UV);
      } else if (u_whichTexture == 1) {
        baseColor = texture2D(u_Sampler1, v_UV);
      } else if (u_whichTexture == 2) {
        baseColor = texture2D(u_Sampler2, v_UV);
      } else if (u_whichTexture == 3) {
        baseColor = texture2D(u_Sampler3, v_UV);
      } else if (u_whichTexture == 4) {
        baseColor = texture2D(u_Sampler4, v_UV);
      } else if (u_whichTexture == 5) {
        baseColor = texture2D(u_Sampler5, v_UV);
      } else {
        baseColor = vec4(1,.2,.2,1);
      }

      if (u_UseLighting) {
        vec3 normal = normalize(v_Normal.xyz);
        
        // orbiting light
        vec3 lightDirection = normalize(u_LightPosition - v_Position);
        float nDotL = max(dot(lightDirection, normal), 0.0);
        vec3 ambient1 = 0.2 * baseColor.rgb;
        vec3 diffuse1 = 0.5 * baseColor.rgb * nDotL * u_LightColor;
        
        // spotlight
        vec3 spotDirection = normalize(u_SpotlightPosition - v_Position);
        float spotEffect = dot(normalize(-spotDirection), normalize(u_SpotlightDirection));
        
        vec3 spotlightContribution = vec3(0.0);
        if (spotEffect > u_SpotlightCutoff) {
          float spotIntensity = (spotEffect - u_SpotlightCutoff) / (1.0 - u_SpotlightCutoff);
          spotIntensity = pow(spotIntensity, 2.0);
          float spotNDotL = max(dot(spotDirection, normal), 0.0);
          vec3 ambient2 = 0.1 * baseColor.rgb;
          vec3 diffuse2 = 0.7 * baseColor.rgb * spotNDotL * spotIntensity * u_SpotlightColor;
          spotlightContribution = ambient2 + diffuse2;
        }
        
        // combine both lights
        gl_FragColor = vec4(ambient1 + diffuse1 + spotlightContribution, baseColor.a);
      } else {
        gl_FragColor = baseColor;
      }
    }
  }`

// add global vars
let canvas;
let gl;
let a_Position;
let a_UV;
let a_Normal;
let u_FragColor;
let u_ModelMatrix, u_GlobalRotateMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_whichTexture;
let u_ShowNormals;
let u_LightPosition;
let u_LightColor;
let u_UseLighting;
let g_showNormals = false;
let g_useLighting = true;

// camera and controls
let g_camera;
let g_globalAngle = 0;
let g_isDragging = false;
let g_lastX = -1, g_lastY = -1;
let g_xRotation = 0, g_yRotation = 0;

// light
let g_lightPos = [2.0, 2.0, 0.0];
let g_lightColor = [1.0, 1.0, 1.0];
let g_lightCube;
let g_lightAngle = 0;
let g_lightSpeed = 30;
let g_lightRadius = 3;
let g_lightHeight = 2;

// spotlight
let g_spotlightPos = [0, 5.0, 0];
let g_spotlightDirection = [0.0, -1.0, 0.0];
let g_spotlightCutoff = 0.91;  // cos(25 degrees)
let g_spotlightCube;
let u_SpotlightPosition;
let u_SpotlightDirection;
let u_SpotlightCutoff;

let g_spotlightColor = [1.0, 1.0, 1.0];
let u_SpotlightColor;

// word data
let g_worldMap = Array.from({length:32}, () => Array.from({length:32}, () => Array(32).fill(0)));
let g_selectedBlockType = 1;
const BUTTON = 5;
let remainingButtons = 0;

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  setupControls();

  initWorldMap();
  g_camera = new Camera();
  g_camera.eye.elements[0] =  0; 
  g_camera.eye.elements[1] =  1;  // one block above floor
  g_camera.eye.elements[2] =  0;
  g_camera.at.elements [0] =  0;
  g_camera.at.elements [1] =  1;
  g_camera.at.elements [2] = -1;

  // Create light cubes
  g_lightCube = new Cube();
  g_lightCube.color = [1.0, 1.0, 0.0, 1.0];  // yellow for orbiting cube
  g_lightCube.textureNum = -2;  // solid color

  g_spotlightCube = new Cube();
  g_spotlightCube.color = [1.0, 1.0, 0.0, 1.0];  // yellow for spotlight cube
  g_spotlightCube.textureNum = -2;

  document.onkeydown = keydown;

  canvas.onmousedown = ev => {
    g_isDragging = true;
    g_lastX = ev.clientX;
    g_lastY = ev.clientY;
  };
  canvas.onmouseup = canvas.onmouseleave = () => {
    g_isDragging = false;
  };
  canvas.onmousemove = ev => {
    if (!g_isDragging) return;
    const dx = ev.clientX - g_lastX;
    const dy = ev.clientY - g_lastY;
    g_lastX = ev.clientX;
    g_lastY = ev.clientY;
    if      (dx >  1) g_camera.panRight();
    else if (dx < -1) g_camera.panLeft();
    if      (dy >  1) g_camera.tiltDown();
    else if (dy < -1) g_camera.tiltUp();
    renderAllShapes();
  };

  initTextures();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  updateBlockTypeDisplay();
  requestAnimationFrame(tick);
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  if (!gl) {
    gl = canvas.getContext("experimental-webgl", {preserveDrawingBuffer: true});
  }
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL(){
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  a_Position = gl.getAttribLocation(gl.program, 'a_Position'); if (a_Position < 0) { console.log('Failed to get the storage location of a_Position'); return; }
  a_UV = gl.getAttribLocation(gl.program, 'a_UV'); if (a_UV < 0) { console.log('Failed to get the storage location of a_UV'); return; }
  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal'); if (a_Normal < 0) { console.log('Failed to get the storage location of a_Normal'); return; }
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor'); if (!u_FragColor) { console.log('Failed to get the storage location of u_FragColor'); return; }
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix'); if (!u_ModelMatrix) { console.log('Failed to get the storage location of u_ModelMatrix'); return; }
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix'); if (!u_GlobalRotateMatrix) { console.log('Failed to get the storage location of u_GlobalRotateMatrix'); return; }
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix'); if (!u_ViewMatrix) { console.log('Failed to get the storage location of u_ViewMatrix'); return; }
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix'); if (!u_ProjectionMatrix) { console.log('Failed to get the storage location of u_ProjectionMatrix'); return; }
  u_ShowNormals = gl.getUniformLocation(gl.program, 'u_ShowNormals'); if (!u_ShowNormals) { console.log('Failed to get the storage location of u_ShowNormals'); return; }
  u_UseLighting = gl.getUniformLocation(gl.program, 'u_UseLighting'); if (!u_UseLighting) { console.log('Failed to get the storage location of u_UseLighting'); return; }

  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0'); if (!u_Sampler0) { console.log('Failed to get the storage location of u_Sampler0'); return false; }
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1'); if (!u_Sampler1) { console.log('Failed to get the storage location of u_Sampler1'); return false; }
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2'); if (!u_Sampler2) { console.log('Failed to get the storage location of u_Sampler2'); return false; }
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3'); if (!u_Sampler3) { console.log('Failed to get the storage location of u_Sampler3'); return false; }
  u_Sampler4 = gl.getUniformLocation(gl.program, 'u_Sampler4'); if (!u_Sampler4) { console.log('Failed to get the storage location of u_Sampler4'); return false; }
  u_Sampler5 = gl.getUniformLocation(gl.program, 'u_Sampler5'); if (!u_Sampler5) { console.log('Failed to get the storage location of u_Sampler5'); return false; }
  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture'); if (!u_whichTexture) { console.log('Failed to get the storage location of u_whichTexture'); return false; }

  u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
  if (!u_LightPosition) {
    console.log('Failed to get the storage location of u_LightPosition');
    return;
  }

  u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  if (!u_LightColor) {
    console.log('Failed to get the storage location of u_LightColor');
    return;
  }

  u_SpotlightPosition = gl.getUniformLocation(gl.program, 'u_SpotlightPosition');
  if (!u_SpotlightPosition) {
    console.log('Failed to get the storage location of u_SpotlightPosition');
    return;
  }

  u_SpotlightDirection = gl.getUniformLocation(gl.program, 'u_SpotlightDirection');
  if (!u_SpotlightDirection) {
    console.log('Failed to get the storage location of u_SpotlightDirection');
    return;
  }

  u_SpotlightCutoff = gl.getUniformLocation(gl.program, 'u_SpotlightCutoff');
  if (!u_SpotlightCutoff) {
    console.log('Failed to get the storage location of u_SpotlightCutoff');
    return;
  }

  u_SpotlightColor = gl.getUniformLocation(gl.program, 'u_SpotlightColor');
  if (!u_SpotlightColor) {
    console.log('Failed to get the storage location of u_SpotlightColor');
    return;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, identityM.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, identityM.elements);
}

function setupControls() {
  document.getElementById('blockTypeSnow').onclick = function() {g_selectedBlockType = 1; updateBlockTypeDisplay();};
  document.getElementById('blockTypeIce').onclick = function() {g_selectedBlockType = 2; updateBlockTypeDisplay();};
  document.getElementById('blockTypeDirt').onclick = function() {g_selectedBlockType = 3; updateBlockTypeDisplay();};
  document.getElementById('blockTypePackedIce').onclick = function() {g_selectedBlockType = 4; updateBlockTypeDisplay();};
  document.getElementById('toggleNormals').onclick = function() {
    g_showNormals = !g_showNormals;
    document.getElementById('toggleNormals').textContent = g_showNormals ? 'Hide Normals' : 'Show Normals';
    renderAllShapes();
  };

  document.getElementById('toggleLighting').onclick = function() {
    g_useLighting = !g_useLighting;
    document.getElementById('toggleLighting').textContent = g_useLighting ? 'Lighting On (L)' : 'Lighting Off (L)';
    renderAllShapes();
  };

  document.getElementById('lightSpeed').addEventListener('input', (ev) => {
    g_lightSpeed = ev.target.value;
  });

  document.getElementById('lightRadius').addEventListener('input', (ev) => {
    g_lightRadius = ev.target.value / 10;
  });

  document.getElementById('lightHeight').addEventListener('input', (ev) => {
    g_lightHeight = ev.target.value / 10;
  });

  // light color handlers
  const updateLightColor = () => {
    g_lightColor[0] = parseFloat(document.getElementById('lightRed').value) / 100.0;
    g_lightColor[1] = parseFloat(document.getElementById('lightGreen').value) / 100.0;
    g_lightColor[2] = parseFloat(document.getElementById('lightBlue').value) / 100.0;
    renderAllShapes();
  };

  document.getElementById('lightRed').addEventListener('input', updateLightColor);
  document.getElementById('lightGreen').addEventListener('input', updateLightColor);
  document.getElementById('lightBlue').addEventListener('input', updateLightColor);

  // spotlight position handlers
  const updateSpotlightPosition = () => {
    g_spotlightPos[0] = parseFloat(document.getElementById('spotlightPosX').value);
    g_spotlightPos[1] = parseFloat(document.getElementById('spotlightPosY').value);
    g_spotlightPos[2] = parseFloat(document.getElementById('spotlightPosZ').value);
    renderAllShapes();
  };

  document.getElementById('spotlightPosX').addEventListener('input', updateSpotlightPosition);
  document.getElementById('spotlightPosY').addEventListener('input', updateSpotlightPosition);
  document.getElementById('spotlightPosZ').addEventListener('input', updateSpotlightPosition);

  // spotlight direction handlers
  const updateSpotlightDirection = () => {
    const x = parseFloat(document.getElementById('spotlightDirX').value) / 100.0;
    const y = parseFloat(document.getElementById('spotlightDirY').value) / 100.0;
    const z = parseFloat(document.getElementById('spotlightDirZ').value) / 100.0;
    const length = Math.sqrt(x*x + y*y + z*z) || 1;
    g_spotlightDirection = [x/length, y/length, z/length];
    renderAllShapes();
  };

  document.getElementById('spotlightDirX').addEventListener('input', updateSpotlightDirection);
  document.getElementById('spotlightDirY').addEventListener('input', updateSpotlightDirection);
  document.getElementById('spotlightDirZ').addEventListener('input', updateSpotlightDirection);

  // spotlight cutoff handler
  document.getElementById('spotlightCutoff').addEventListener('input', (ev) => {
    const angleInDegrees = parseFloat(ev.target.value);
    const angleInRadians = angleInDegrees * Math.PI / 180.0;
    g_spotlightCutoff = Math.cos(angleInRadians);
    renderAllShapes();
  });

  // spotlight color handlers
  const updateSpotlightColor = () => {
    g_spotlightColor[0] = parseFloat(document.getElementById('spotlightRed').value) / 100.0;
    g_spotlightColor[1] = parseFloat(document.getElementById('spotlightGreen').value) / 100.0;
    g_spotlightColor[2] = parseFloat(document.getElementById('spotlightBlue').value) / 100.0;
    renderAllShapes();
  };

  document.getElementById('spotlightRed').addEventListener('input', updateSpotlightColor);
  document.getElementById('spotlightGreen').addEventListener('input', updateSpotlightColor);
  document.getElementById('spotlightBlue').addEventListener('input', updateSpotlightColor);
}

function updateBlockTypeDisplay() {
  const blockTypes = {
    1: "Snow",
    2: "Ice",
    3: "Dirt",
    4: "Packed Ice"
  };
  document.getElementById('currentBlockType').textContent = blockTypes[g_selectedBlockType] || "Snow";
}

// world setup
function initWorldMap() {
  // 3D world map array
  for(let y = 0; y < 32; y++) {
    for(let z = 0; z < 32; z++) {
      for(let x = 0; x < 32; x++) {
        g_worldMap[y][z][x] = 0;
      }
    }
  }
  // floor (y=0)
  for(let z = 0; z < 32; z++) {
    for(let x = 0; x < 32; x++) {
      g_worldMap[0][z][x] = 1; // 1 = snow
    }
  }
  // mountain
  for(let z = 8; z <= 12; z++) {
    for (let x = 8; x <= 12; x++) {
      g_worldMap[1][z][x] = 3; // dirt
      g_worldMap[2][z][x] = 3; // dirt
      g_worldMap[3][z][x] = 1; // snow
    }
  }
  for(let z = 12; z <= 15; z++) {
    for (let x = 6; x <= 9; x++) {
      g_worldMap[1][z][x] = 3; // dirt
      g_worldMap[2][z][x] = 1; // dirt
    }
  }
  // second mountain
  for(let z = 25; z <= 27; z++) {
    for (let x = 17; x <= 21; x++) {
      g_worldMap[1][z][x] = 3; // dirt
      g_worldMap[2][z][x] = 1; // dirt
    }
  }
  // walls
  for (let i = 0; i < 32; i++) {
    for (let y = 1; y <= 2; y++) {
      g_worldMap[y][0][i] = 3;  
      g_worldMap[y][31][i] = 3;
      g_worldMap[y][i][0] = 3;
      g_worldMap[y][i][31] = 3;
    }
    g_worldMap[3][0][i] = 1;
    g_worldMap[3][31][i] = 1;
    g_worldMap[3][i][0] = 1;
    g_worldMap[3][i][31] = 1;
  }
  for(let z = 15; z <= 20; z++) {
    for (let x = 24; x <= 28; x++) {
      g_worldMap[1][z][x] = 1;
    }
  }
  
  // ice pool
  for (let z = 20; z < 23; z++) {
    for (let x = 20; x < 23; x++) {
      g_worldMap[0][z][x] = 2; // ground level
    }
  }

  // large ice spikes 3x3x4, cross shape x3, center x3
  const largeCoords = [[5,5],[5,26],[26,5],[26,26],[5,10],[14,20], [10,28], [23,21], [28,13],[10,13]];
  for (let s = 0; s < largeCoords.length; s++) {
    const [cx, cz] = largeCoords[s];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let h = 1; h <= 4; h++) {
          const x = cx + dx;
          const z = cz + dz;
          if (x >= 0 && x < 32 && z >= 0 && z < 32) {
            g_worldMap[h][z][x] = 2; // ice
          }
        }
      }
    }
    // Cross shape
    const crossOffsets = [[0,0], [1,0], [-1,0], [0,1], [0,-1]];
    for (const [dx, dz] of crossOffsets) {
      for (let h = 5; h <= 7; h++) {
        const x = cx + dx;
        const z = cz + dz;
        if (x >= 0 && x < 32 && z >= 0 && z < 32) {
          g_worldMap[h][z][x] = 2;
        }
      }
    }
    // Center column
    for (let h = 8; h <= 10; h++) {
      if (cx >= 0 && cx < 32 && cz >= 0 && cz < 32) {
        g_worldMap[h][cz][cx] = 2;
      }
    }
  }

  // medium ice spikes cross x 3, center x 4
  const medCoords = [[8,18],[12,4],[22,11],[28,18],[16,28]];
  for (let m = 0; m < medCoords.length; m++) {
    const [cx, cz] = medCoords[m];
    const crossOffsets = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dx, dz] of crossOffsets) {
      for (let h = 1; h <= 4; h++) {
        const x = cx + dx;
        const z = cz + dz;
        if (x >= 0 && x < 32 && z >= 0 && z < 32) {
          g_worldMap[h][z][x] = 2;
        }
      }
    }
    for (let h = 5; h <= 6; h++) {
      if (cx >= 0 && cx < 32 && cz >= 0 && cz < 32) {
        g_worldMap[h][cz][cx] = 2;
      }
    }
  }

  // small ice spikes
  const smallCoords = [[22,14],[22,25],[14,27],[8,23],[2,14]];
  for (let t = 0; t < smallCoords.length; t++) {
    const [cx, cz] = smallCoords[t];
    // Base 2x2 height 
    for (let dx = 0; dx <= 1; dx++) {
      for (let dz = 0; dz <= 1; dz++) {
        for (let h = 1; h <= 3; h++) {
          const x = cx + dx;
          const z = cz + dz;
          if (x >= 0 && x < 32 && z >= 0 && z < 32) {
            g_worldMap[h][z][x] = 2;
          }
        }
      }
    }
    // block at one corner (cx,cz)
    for (let h = 4; h <= 5; h++) {
      if (cx >= 0 && cx < 32 && cz >= 0 && cz < 32) {
        g_worldMap[h][cz][cx] = 2;
      }
    }
  }


  // igloo
  const icx = 18, icz = 5;
  // two layers, ring radius 3
  for (let y = 1; y <= 2; y++) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const dist2 = dx*dx + dz*dz;
        if (dist2 >= 7 && dist2 <= 12) {
          const x = icx + dx, z = icz + dz;
          if (x>=0&&x<32&&z>=0&&z<32) g_worldMap[y][z][x] = 4;
        }
      }
    }
  }
  // entrance
  g_worldMap[1][8][18] = 0;
  g_worldMap[2][8][18] = 0;
  g_worldMap[1][9][17] = 4;
  g_worldMap[2][9][17] = 4;
  g_worldMap[1][9][19] = 4;
  g_worldMap[2][9][19] = 4;
  g_worldMap[3][9][18] = 4;

  // roof
  for (let layer = 0; layer < 3; layer++) {
    const y = 3 + layer;
    const r = 3 - layer;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx*dx + dz*dz <= r*r) {
          const x = icx + dx, z = icz + dz;
          if (x>=0&&x<32&&z>=0&&z<32) g_worldMap[y][z][x] = 4;
        }
      }
    }
  }
  remainingButtons = 5;
  if (g_worldMap[1][13][18] === 0) {
    g_worldMap[1][13][18] = BUTTON;
  }
  let placed = 1;
  let tries = 0;
  while (placed < 5 && tries++ < 1000) {
    const x = Math.floor(Math.random() * 32);
    const z = Math.floor(Math.random() * 32);
    if (g_worldMap[1][z][x] === 0) {      // empty just above floor
      g_worldMap[1][z][x] = BUTTON;
      placed++;
    }
  }
  remainingButtons = placed;
}

// textures
function initTextures() {
  const textureFiles = [
    'sky.jpg',
    'snow.jpg',
    'ice.jpg',
    'dirt.jpg',
    'packedice.jpg',
    'wood.jpg'
  ];
  
  textureFiles.forEach((url, index) => {
    const img = new Image();
    img.onload = () => {
      sendImageToTexture(img, index);
      console.log(`Loaded texture ${url}`);
      renderAllShapes();  // redraw as soon as available
    };
    img.onerror = () => console.error(`Failed to load ${url}`);
    img.src = url;
  });
  return true;
}

function sendImageToTexture(image, textureUnit) {
  var texture = gl.createTexture();   // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
  
  // Enable the appropriate texture unit
  gl.activeTexture(gl.TEXTURE0 + textureUnit);
  
  // Bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
  // Set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  
  // Set the texture unit to the sampler
  const samplers = [u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3, u_Sampler4, u_Sampler5];
  gl.uniform1i(samplers[textureUnit], textureUnit);
  
  console.log('finished loadTexture');
}


// rendering loop
var g_startTime=performance.now()/1000.0;
var g_seconds=performance.now()/1000.0-g_startTime;

function tick() {
  g_seconds = performance.now()/1000.0-g_startTime;
  
  // Update light position for orbital motion
  if (g_lightSpeed > 0) {
    g_lightAngle += (g_lightSpeed / 1000);  // Convert slider value to reasonable speed
    g_lightPos[0] = Math.cos(g_lightAngle) * g_lightRadius;  // X coordinate
    g_lightPos[2] = Math.sin(g_lightAngle) * g_lightRadius;  // Z coordinate
    g_lightPos[1] = g_lightHeight;  // Y coordinate (height)
  }
  
  renderAllShapes();
  requestAnimationFrame(tick);
}

function renderAllShapes() {
  var startTime = performance.now()

  var projMat = new Matrix4();
  projMat.setPerspective(60, canvas.width/canvas.height, 0.1, 1000);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  var viewMat = new Matrix4();
  viewMat.setLookAt(
    g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2],
    g_camera.at.elements[0],  g_camera.at.elements[1],  g_camera.at.elements[2],
    g_camera.up.elements[0],  g_camera.up.elements[1],  g_camera.up.elements[2]
  );
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);
    
  var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  gl.uniform1i(u_ShowNormals, g_showNormals);
  gl.uniform1i(u_UseLighting, g_useLighting);  // Pass lighting state to shader
  gl.uniform3fv(u_LightPosition, g_lightPos);
  gl.uniform3fv(u_LightColor, g_lightColor);
  gl.uniform3fv(u_SpotlightPosition, g_spotlightPos);
  gl.uniform3fv(u_SpotlightDirection, g_spotlightDirection);
  gl.uniform1f(u_SpotlightCutoff, g_spotlightCutoff);
  gl.uniform3fv(u_SpotlightColor, g_spotlightColor);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // sky
  var sky = new Cube();
  sky.color = [1.0,0.0,0.0,1.0];
  sky.textureNum = 0;
  sky.matrix.scale(50,50,50);
  sky.matrix.translate(-0.5,-0.5,-0.5);
  sky.renderfast();

  // Test sphere
  var sphere = new Sphere(20);  // 20 segments for smooth appearance
  sphere.color = [1.0, 1.0, 1.0, 1.0];
  sphere.matrix.translate(0, 2, -5);  // Position it above ground and in front of camera
  sphere.matrix.scale(0.5, 0.5, 0.5); // Make it smaller
  sphere.renderfast();

  // Render light cube
  g_lightCube.matrix.setTranslate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  g_lightCube.matrix.scale(0.1, 0.1, 0.1);  // Make it small
  g_lightCube.color = [1.0, 1.0, 0.0, 1.0];  // Yellow color
  g_lightCube.renderfast();

  // Render spotlight cube
  g_spotlightCube.matrix.setTranslate(g_spotlightPos[0], g_spotlightPos[1], g_spotlightPos[2]);
  g_spotlightCube.matrix.scale(0.1, 0.1, 0.1);
  g_spotlightCube.color = [1.0, 1.0, 0.0, 1.0];  // Yellow color
  g_spotlightCube.renderfast();

  // world blocks
  const half = 16;
  for (let y = 0; y < 32; y++) {
    for (let z = 0; z < 32; z++) {
      for (let x = 0; x < 32; x++) {
        const bt = g_worldMap[y][z][x];
        if (bt === 0) continue;
        const cube = new Cube();
        cube.textureNum = bt;
        if (bt === BUTTON) { // small button
          cube.matrix
              .setTranslate(x - half,  (y - 1),  z - half)
              .scale(0.3, 0.1, 0.2);
        } else { // normal full blocks
          cube.matrix
              .setTranslate(x - half, y - 1, z - half);
        }
        cube.renderfast();
      }
    }
  }
  
  // highlight target block
  const targetBlock = getBlockInFront();
  if(targetBlock.x >= 0 && targetBlock.x < 32 && targetBlock.z >= 0 && targetBlock.z < 32) {
    const indicator = new Cube();
    indicator.color = [1.0, 1.0, 0.0, 0.5];
    indicator.textureNum = -2;
    indicator.matrix.setTranslate(targetBlock.x-half, targetBlock.y+0.05, targetBlock.z-half);
    indicator.matrix.scale(1.05, 0.05, 1.05); // highlight on top of the block
    indicator.renderfast();
  }

  var duration = performance.now() - startTime;
  sendTextToHTML(`Buttons left: ${remainingButtons}`, 'buttonsRemaining');
  sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot")
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

// block interaction
function getTargetCell(){
  const e=g_camera.eye.elements, a=g_camera.at.elements;
  let vx=a[0]-e[0], vz=a[2]-e[2];
  const len=Math.hypot(vx,vz)||1; vx/=len; vz/=len;
  const x=Math.floor(e[0]+vx*1.2+0.5), z=Math.floor(e[2]+vz*1.2+0.5);
  return {x,z};
}

function modifyBlock(delta){
  const {x,z}=getTargetCell();
  if(x<0||x>=32||z<0||z>=32) return;
  const stack=mapStacks[z][x];
  if(delta<0){ stack.pop(); }
  else { stack.push(3); }
}

function getBlockInFront() {
  const dirX = g_camera.at.elements[0] - g_camera.eye.elements[0];
  const dirZ = g_camera.at.elements[2] - g_camera.eye.elements[2];

  const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
  const normDirX = dirX / length;
  const normDirZ = dirZ / length;
  
  const eyeX = g_camera.eye.elements[0];
  const eyeZ = g_camera.eye.elements[2];
  
  const targetX = eyeX + normDirX * 3;
  const targetZ = eyeZ + normDirZ * 3;
  
  const mapX = Math.floor(targetX + 16);
  const mapZ = Math.floor(targetZ + 16);
  
  let mapY = 0;
  for(let y = 0; y < 32; y++) {
    if(mapZ >= 0 && mapZ < 32 && mapX >= 0 && mapX < 32 && g_worldMap[y][mapZ][mapX] > 0) {
      mapY = y;
    }
  }
  return {x: mapX, y: mapY, z: mapZ};
}

function addBlock() {
  const target = getBlockInFront();
  if(target.x >= 0 && target.x < 32 && target.z >= 0 && target.z < 32) {
    // add a block on top
    const y = target.y + 1;
    if(y < 32 && g_worldMap[y][target.z][target.x] === 0) {
      g_worldMap[y][target.z][target.x] = g_selectedBlockType;
      console.log(`Added ${g_selectedBlockType} block at (${target.x}, ${y}, ${target.z})`);
      return true;
    }
  }
  return false;
}

function removeBlock() {
  const target = getBlockInFront();
  const { x, y, z } = target;

  if (x < 0 || x >= 32 || z < 0 || z >= 32) return false;
  if (y === 0) return false;  // don't remove the floor

  const bt = g_worldMap[y][z][x];
  if (bt === BUTTON) {
    remainingButtons--;
    if (remainingButtons === 0) {
      alert("You found all 5 buttons! You win!");
    } else {
      console.log(`Buttons remaining: ${remainingButtons}`);
    }
  }
  // actually remove it:
  g_worldMap[y][z][x] = 0;
  return true;
}

// event handling
function keydown(ev) {
  const e = g_camera.eye.elements;
  const a = g_camera.at.elements;
  switch (ev.key) {
    case 'w': g_camera.forward(); break;
    case 's': g_camera.back(); break;
    case 'a': g_camera.left(); break;
    case 'd': g_camera.right(); break;
    case 'q': g_camera.panLeft(); break;
    case 'e': g_camera.panRight(); break;
    case 'f': addBlock(); break;
    case 'r': removeBlock(); break;
    case 'n': 
      g_showNormals = !g_showNormals;
      document.getElementById('toggleNormals').textContent = g_showNormals ? 'Hide Normals (N)' : 'Show Normals (N)';
      break;
    case '1': case '2': case '3': case '4':
      g_selectedBlockType = Number(ev.key);
      updateBlockTypeDisplay();
      break;
    case 'l': case 'L':  // Add keyboard shortcut for lighting toggle
      g_useLighting = !g_useLighting;
      document.getElementById('toggleLighting').textContent = g_useLighting ? 'Lighting On (L)' : 'Lighting Off (L)';
      break;
  }
  renderAllShapes();
  // console.log(ev.keyCode);
}