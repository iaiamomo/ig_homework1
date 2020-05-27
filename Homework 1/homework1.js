"use strict";

var canvas;
var gl;

var numVertices = 0;

var program;

var near = 3;
var far = 20;
var radius = 5.0;
var theta = 0.0;
var phi = 50.0;
var dr = 5.0 * Math.PI / 180.0;

var fovy = 60.0;  //Field of View in Y direction angle (in degrees)
var aspect;       // Viewport aspect ratio

//Camera position
var eye;
const at = vec3( 0.0, 0.0, 0.0 );
const up = vec3( 0.0, 1.0, 0.0 );

//Directional light
var lightPosition = vec4( 1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4( 0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 0.6, 0.6, 0.6, 1.0 );

//Spotlight
var spotPosition = vec4( 0.0, 0.0, 0.0, 1.0 );
var spotAmbient = vec4( 0.2, 0.2, 0.2, 1.0 );
var spotDiffuse = vec4( 0.4, 0.4, 0.4, 1.0 );
var spotDirection = vec4( -0.5, 0.5, -10.0, 0.0);
var spotCutoff = 5.0;    //alpha or e
var spotTheta = 8.0;
//spotlight attenuation factors
var spotConstant = 1.0;
var spotLinear = 0.0;
var spotQuadratic = 0.0;

//Material
var materialAmbient = vec4( 0.5, 0.5, 0.5, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );

//Global ambient light - Simple Cartoon Shading
var globalAmbient = vec4(0.1, 0.1, 0.1, 1.0);

var positionsArray = [];
var normalsArray = [];
var texCoordsArray = [];

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var nMatrix, nMatrixLoc;

var vertices = [
  vec4( -0.5, -0.5, 0.5, 1.0 ),   // 0
  vec4( -0.6, 0, 0.6, 1.0 ),      // 1
  vec4( -0.5,  0.5,  0.5, 1.0 ),  // 2
  vec4( 0, 0.6, 0.2, 1.0 ),       // 3
  vec4( 0.5,  0.5,  0.5, 1.0 ),   // 4
  vec4( 0.6, 0, 0.6, 1.0),        // 5
  vec4( 0.5, -0.5,  0.5, 1.0 ),   // 6
  vec4( 0, -0.6, 0.6, 1.0 ),      // 7
  vec4( -0.5, -0.5, -0.5, 1.0 ),  // 8
  vec4( -0.6, 0, -0.6, 1.0 ),     // 9
  vec4( -0.5,  0.5, -0.5, 1.0 ),  // 10
  vec4( 0, 0.6, -0.6, 1.0 ),      // 11
  vec4( 0.5,  0.5, -0.5, 1.0 ),   // 12
  vec4( 0.6, 0, -0.6, 1.0 ),      // 13
  vec4( 0.5, -0.5, -0.5, 1.0 ),   // 14
  vec4( 0, -0.6, -0.6, 1.0 ),     // 15
  vec4( -0.6, 0.6, 0, 1.0 ),      // 16
  vec4( 0.6, 0.6, 0, 1.0 ),       // 17
  vec4( 0.6, -0.6, 0, 1.0 ),      // 18
  vec4( -0.6, -0.6, 0, 1.0)       // 19
];

var c_front = vec4( 0, 0.1, 0.7, 1.0 );
var c_right = vec4( 1.4, 0, 0, 1.0 );
var c_down = vec4( 0, -0.7, 0, 1.0 );
var c_up = vec4( 0, 2, 0, 1.0 );
var c_back = vec4( 0, -0.1,  -0.7, 1.0 );
var c_left = vec4( -0.7, 0,  0, 1.0 );

var texCoord = [
  vec2(0, 0),
  vec2(0, 1),
  vec2(1, 1),
  vec2(1, 0)
];

var thetaLoc;

//TEXTURE
var textureFlag = true;
var texSize = 64;
function configureTexture(image) {
  var texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

function triangle(a, b, c, control){
  //compute normal wrt triangle
  var t1 = subtract(vertices[b], a);
  var t2 = subtract(vertices[c], vertices[b]);
  var normal = cross(t1, t2);
  normal = vec3(normal);

  positionsArray.push(a);
  normalsArray.push(normal);
  
  positionsArray.push(vertices[b]);
  normalsArray.push(normal);

  positionsArray.push(vertices[c]);
  normalsArray.push(normal);

  texCoordsArray.push(texCoord[0]);
  if ( control == 1){
    texCoordsArray.push(texCoord[1]);
    texCoordsArray.push(texCoord[2]);
  } else {
    texCoordsArray.push(texCoord[2]);
    texCoordsArray.push(texCoord[1]);
  }

  numVertices += 3;
}

function pushElements(a, b, c, d, e, f, g, h, i, center){
  triangle(center, a, b, 1);
  triangle(center, b, c, 2);
  triangle(center, c, d, 1);
  triangle(center, d, e, 2);
  triangle(center, e, f, 1);
  triangle(center, f, g, 2);
  triangle(center, g, h, 1);
  triangle(center, h, i, 2);
}

function colorCube()
{
  //back
  pushElements(8, 9, 10, 11, 12, 13, 14, 15, 8, c_back);
  //left
  pushElements(10, 9, 8, 19, 0, 1, 2, 16, 10, c_left);
  //down
  pushElements(6, 7, 0, 19, 8, 15, 14, 18, 6, c_down);
  //up 
  pushElements(10, 16, 2, 3, 4, 17, 12, 11, 10, c_up);
  //right
  pushElements(4, 5, 6, 18, 14, 13, 12, 17, 4, c_right);
  //front
  pushElements(2, 1, 0, 7, 6, 5, 4, 3, 2, c_front);
}

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");

  gl = canvas.getContext('webgl2');
  if (!gl) alert("WebGL 2.0 isn't available");

  gl.viewport(0, 0, canvas.width, canvas.height);
  aspect =  canvas.width/canvas.height;   //Field of View
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  //light
  var ambientProduct = mult(lightAmbient, materialAmbient);
  var diffuseProduct = mult(lightDiffuse, materialDiffuse);

  //spotlight
  var ambientProductSpot = mult(spotAmbient, materialAmbient);
  var diffuseProductSpot = mult(spotDiffuse, materialDiffuse);

  colorCube();

  //positionsArray
  var vBuffer = gl.createBuffer();
  gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData( gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW );

  var vPosition = gl.getAttribLocation( program, "aPosition" );
  gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray( vPosition );

  //normalsArray
  var nBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

  var normalLoc = gl.getAttribLocation(program, "aNormal");
  gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray( normalLoc);

  //texCoordArray
  var tBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

  var texCoordLoc = gl.getAttribLocation(program, "aTexCoord");
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(texCoordLoc);

  var image = document.getElementById("texImage");
  configureTexture(image);
  gl.uniform1i( gl.getUniformLocation(program, "uTextureMap"), 0);
  
  modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
  projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");
  nMatrixLoc = gl.getUniformLocation(program, "uNormalMatrix");

  //light
  gl.uniform4fv(gl.getUniformLocation(program,"uAmbientProduct"),flatten(ambientProduct));
  gl.uniform4fv(gl.getUniformLocation(program,"uDiffuseProduct"),flatten(diffuseProduct));
  gl.uniform4fv(gl.getUniformLocation(program,"uLightPosition"),flatten(lightPosition));
  
  //spotlight
  gl.uniform4fv(gl.getUniformLocation(program,"uSpotPosition"),flatten(spotPosition));
  gl.uniform4fv(gl.getUniformLocation(program,"uAmbientProductSpot"),flatten(ambientProductSpot));
  gl.uniform4fv(gl.getUniformLocation(program,"uDiffuseProductSpot"),flatten(diffuseProductSpot));

  //simple cartoon shade
  globalAmbient = mult(globalAmbient, materialAmbient);
  gl.uniform4fv(gl.getUniformLocation(program,"globalAmbientLight"),flatten(globalAmbient));
  
  //buttons for viewing parameters
  document.getElementById("Button1").onclick = function(){near  += 0.1;};
  document.getElementById("Button2").onclick = function(){near -= 0.1;};
  document.getElementById("Button3").onclick = function(){far += 0.1;};
  document.getElementById("Button4").onclick = function(){far -= 0.1;};
  document.getElementById("Button5").onclick = function(){theta += dr;};
  document.getElementById("Button6").onclick = function(){theta -= dr;};
  document.getElementById("Button7").onclick = function(){phi += dr;};
  document.getElementById("Button8").onclick = function(){phi -= dr;};
  document.getElementById("Button9").onclick = function(){spotCutoff += 15.0;};
  document.getElementById("Button10").onclick = function(){spotCutoff -= 15.0;};
  document.getElementById("Button11").onclick = function(){spotTheta += 0.1;};
  document.getElementById("Button12").onclick = function(){spotTheta -= 0.1;};
  document.getElementById("xSlider").onchange = function(event) {spotDirection[0] = event.target.value;};
  document.getElementById("ySlider").onchange = function(event) {spotDirection[1] = event.target.value;};
  document.getElementById("Button13").onclick = function(){spotLinear += 0.1;};
  document.getElementById("Button14").onclick = function(){spotLinear -= 0.1;};
  document.getElementById("Button15").onclick = function(){spotQuadratic += 0.1;};
  document.getElementById("Button16").onclick = function(){spotQuadratic -= 0.1;};
  document.getElementById("Button17").onclick = function(){textureFlag = !textureFlag;};

  render();
}

function render() {
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //camera position 
  var eye = vec3(radius*Math.sin(theta)*Math.cos(phi),radius*Math.sin(theta)*Math.sin(phi),radius*Math.cos(theta));

  modelViewMatrix = lookAt(eye, at, up);  //viewer position
  projectionMatrix = perspective(fovy, aspect, near, far);  //perspective projection
  nMatrix = normalMatrix(modelViewMatrix, true);

  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
  gl.uniformMatrix3fv(nMatrixLoc, false, flatten(nMatrix));

  gl.uniform1f(gl.getUniformLocation(program,"uCutoffSpot"),spotCutoff);
  gl.uniform1f(gl.getUniformLocation(program,"uThetaSpot"),spotTheta);
  gl.uniform4fv(gl.getUniformLocation(program,"uSpotDirection"),flatten(spotDirection));
  gl.uniform1f(gl.getUniformLocation(program,"uConstantSpot"),spotConstant);
  gl.uniform1f(gl.getUniformLocation(program,"uLinearSpot"),spotLinear);
  gl.uniform1f(gl.getUniformLocation(program,"uQuadraticSpot"),spotQuadratic);

  gl.uniform1f(gl.getUniformLocation(program, "textureFlag"), textureFlag);
  
  for(var i=0; i<numVertices; i+=3)
    gl.drawArrays(gl.TRIANGLES, i, 3);

  requestAnimationFrame(render);
}
