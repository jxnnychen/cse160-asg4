class Sphere {
    constructor(segments = 20) {
        this.type = 'sphere';
        this.segments = segments;  // number of segments both vertically and horizontally
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.textureNum = -2;
        
        this.initVertices();
    }

    initVertices() {
        let vertices = [];
        let uvs = [];
        let normals = [];

        for (let lat = 0; lat <= this.segments; lat++) {
            const theta = lat * Math.PI / this.segments;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let long = 0; long <= this.segments; long++) {
                const phi = long * 2 * Math.PI / this.segments;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                // (x, y, z)
                const x = cosPhi * sinTheta;  // r * sin(θ)cos(φ)
                const y = cosTheta;           // r * cos(θ)
                const z = sinPhi * sinTheta;  // r * sin(θ)sin(φ)

                vertices.push(x, y, z);

                // normal (same as position for a unit sphere)
                normals.push(x, y, z);

                // texture coordinates
                uvs.push(long/this.segments, lat/this.segments);
            }
        }

        let indices = [];
        for (let lat = 0; lat < this.segments; lat++) {
            for (let long = 0; long < this.segments; long++) {
                const first = (lat * (this.segments + 1)) + long;
                const second = first + this.segments + 1;

                // first triangle
                indices.push(first);
                indices.push(second);
                indices.push(first + 1);

                // second triangle
                indices.push(second);
                indices.push(second + 1);
                indices.push(first + 1);
            }
        }

        this.vertices = new Float32Array(vertices);
        this.uvs = new Float32Array(uvs);
        this.normals = new Float32Array(normals);
        this.indices = new Uint16Array(indices);
    }

    render() {
        var rgba = this.color;

        gl.uniform1i(u_whichTexture, this.textureNum);
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // Create and bind vertex buffer
        var vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // Create and bind UV buffer
        var uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        // Create and bind normal buffer
        var normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        // Create and bind index buffer
        var indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    renderfast() {
        this.render();
    }
} 