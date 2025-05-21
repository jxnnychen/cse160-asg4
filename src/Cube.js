class Cube{
    constructor() {
      this.type='cube';
    //   this.position = [0.0, 0.0, 0.0];
      this.color = [1.0, 1.0, 1.0, 1.0];
    //   this.size = 5.0
    //   this.segments = 10;
    this.matrix = new Matrix4();
    this.textureNum = -2;
    }
  
    render() {
        var rgba = this.color;
  
        gl.uniform1i(u_whichTexture, this.textureNum);
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // front - normal (0,0,1)
        drawTriangle3DUVNormal([0,0,0, 1,1,0, 1,0,0], [0,0, 1,1, 1,0], [0,0,1, 0,0,1, 0,0,1]);
        drawTriangle3DUVNormal([0,0,0, 0,1,0, 1,1,0], [0,0, 0,1, 1,1], [0,0,1, 0,0,1, 0,0,1]);

        // top - normal (0,1,0)
        drawTriangle3DUVNormal([0,1,0, 0,1,1, 1,1,1], [0,0, 0,1, 1,1], [0,1,0, 0,1,0, 0,1,0]);
        drawTriangle3DUVNormal([0,1,0, 1,1,1, 1,1,0], [0,0, 1,1, 1,0], [0,1,0, 0,1,0, 0,1,0]);   

        // bottom - normal (0,-1,0)
        drawTriangle3DUVNormal([0,0,0, 1,0,0, 1,0,1], [0,1, 1,1, 1,0], [0,-1,0, 0,-1,0, 0,-1,0]);
        drawTriangle3DUVNormal([0,0,0, 1,0,1, 0,0,1], [0,1, 1,0, 0,0], [0,-1,0, 0,-1,0, 0,-1,0]);

        // left - normal (-1,0,0)
        drawTriangle3DUVNormal([0,0,0, 0,0,1, 0,1,1], [1,0, 0,0, 0,1], [-1,0,0, -1,0,0, -1,0,0]);
        drawTriangle3DUVNormal([0,0,0, 0,1,1, 0,1,0], [1,0, 0,1, 1,1], [-1,0,0, -1,0,0, -1,0,0]);

        // right - normal (1,0,0)
        drawTriangle3DUVNormal([1,0,0, 1,1,0, 1,1,1], [0,0, 0,1, 1,1], [1,0,0, 1,0,0, 1,0,0]);
        drawTriangle3DUVNormal([1,0,0, 1,1,1, 1,0,1], [0,0, 1,1, 1,0], [1,0,0, 1,0,0, 1,0,0]);

        // back - normal (0,0,-1)
        drawTriangle3DUVNormal([0,0,1, 0,1,1, 1,1,1], [1,0, 1,1, 0,1], [0,0,-1, 0,0,-1, 0,0,-1]);
        drawTriangle3DUVNormal([0,0,1, 1,1,1, 1,0,1], [1,0, 0,1, 0,0], [0,0,-1, 0,0,-1, 0,0,-1]);
    }

    renderfast() {
      var rgba = this.color;

      gl.uniform1i(u_whichTexture, this.textureNum);
      gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
      gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

      var allVerts = [];
      var allUVs = [];
      var allNormals = [];

      // front - normal (0,0,1)
      allVerts = allVerts.concat([0,0,0, 1,1,0, 1,0,0]);
      allUVs = allUVs.concat([0,0, 1,1, 1,0]);
      allNormals = allNormals.concat([0,0,1, 0,0,1, 0,0,1]);
      allVerts = allVerts.concat([0,0,0, 0,1,0, 1,1,0]);
      allUVs = allUVs.concat([0,0, 0,1, 1,1]);
      allNormals = allNormals.concat([0,0,1, 0,0,1, 0,0,1]);
      
      // top - normal (0,1,0)
      allVerts = allVerts.concat([0,1,0, 0,1,1, 1,1,1]);
      allUVs = allUVs.concat([0,0, 0,1, 1,1]);
      allNormals = allNormals.concat([0,1,0, 0,1,0, 0,1,0]);
      allVerts = allVerts.concat([0,1,0, 1,1,1, 1,1,0]);   
      allUVs = allUVs.concat([0,0, 1,1, 1,0]);
      allNormals = allNormals.concat([0,1,0, 0,1,0, 0,1,0]);
     
      // bottom - normal (0,-1,0)
      allVerts = allVerts.concat([0,0,0, 1,0,0, 1,0,1]);
      allUVs = allUVs.concat([0,1, 1,1, 1,0]);
      allNormals = allNormals.concat([0,-1,0, 0,-1,0, 0,-1,0]);
      allVerts = allVerts.concat([0,0,0, 1,0,1, 0,0,1]);
      allUVs = allUVs.concat([0,1, 1,0, 0,0]);
      allNormals = allNormals.concat([0,-1,0, 0,-1,0, 0,-1,0]);
      
      // left - normal (-1,0,0)
      allVerts = allVerts.concat([0,0,0, 0,0,1, 0,1,1]);
      allUVs = allUVs.concat([1,0, 0,0, 0,1]);
      allNormals = allNormals.concat([-1,0,0, -1,0,0, -1,0,0]);
      allVerts = allVerts.concat([0,0,0, 0,1,1, 0,1,0]);
      allUVs = allUVs.concat([1,0, 0,1, 1,1]);
      allNormals = allNormals.concat([-1,0,0, -1,0,0, -1,0,0]);

      // right - normal (1,0,0)
      allVerts = allVerts.concat([1,0,0, 1,1,0, 1,1,1]);
      allUVs = allUVs.concat([0,0, 0,1, 1,1]);
      allNormals = allNormals.concat([1,0,0, 1,0,0, 1,0,0]);
      allVerts = allVerts.concat([1,0,0, 1,1,1, 1,0,1]);
      allUVs = allUVs.concat([0,0, 1,1, 1,0]);
      allNormals = allNormals.concat([1,0,0, 1,0,0, 1,0,0]);

      // back - normal (0,0,-1)
      allVerts = allVerts.concat([0,0,1, 0,1,1, 1,1,1]);
      allUVs = allUVs.concat([1,0, 1,1, 0,1]);
      allNormals = allNormals.concat([0,0,-1, 0,0,-1, 0,0,-1]);
      allVerts = allVerts.concat([0,0,1, 1,1,1, 1,0,1]);
      allUVs = allUVs.concat([1,0, 0,1, 0,0]);
      allNormals = allNormals.concat([0,0,-1, 0,0,-1, 0,0,-1]);
      
      drawTriangle3DUVNormalBatch(allVerts, allUVs, allNormals);
    }
}
  