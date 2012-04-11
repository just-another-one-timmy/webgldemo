var container;
var camera;
var scene;
var renderer;
var plane;
var repulsionCoef = 500;
var attractionCoef = 1e-4;
var deltaT = 0.05;
var dampingCoef = 0.5;
var cameraStepSize = 25;
var maxIterations = 100, iterations = 0;

document.onkeydown = function (event) {
    switch (String.fromCharCode(event.which).toLowerCase()) {
    case "a":
        camera.position.x -= cameraStepSize;
        break;
    case "d":
        camera.position.x += cameraStepSize;
        break;
    case "w":
        camera.position.z -= cameraStepSize;
        break;
    case "s":
        camera.position.z += cameraStepSize;
        break;
    case "f":
        camera.position.y -= cameraStepSize;
        break;
    case "r":
        camera.position.y += cameraStepSize;
        break;
    }
}

var graph = new function () {
    // for each letter stores it frequency in the text and 3d object to display
    this.nodes = [];
    // for each pair of letters stores it frequency in the text
    this.edges = [];

    var lastLetter = undefined;

    this.animationPhase = 1;
    
    this.getEdge = function (mark) {
        var i, edge;
        for (i in this.edges) {
            edge = this.edges[i];
            if (edge.mark === mark) {
                return edge;
            }
        }
    };

    this.getNode = function (letter) {
        var i, node;
        for (i in this.nodes) {
            node = this.nodes[i];
            if (node.mark === letter) {
                return node;
            }
        }
        return undefined;
    };

    this.createEdge = function (mark) {
        var edge = {mark: mark, freq: 0};
        this.edges.push(edge);
        return edge;
    };

    this.makeMesh3d = function () {
        var geometry = new THREE.SphereGeometry(10, 32, 32),
        material = new THREE.MeshLambertMaterial({color: Math.random() * 0xffffff});
        geometry.dynamic = true;
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.setX((Math.random() - 0.5) * 200);
        mesh.position.setZ((Math.random() - 0.5) * 200);
        mesh.position.setY((Math.random() - 0.5) * 10);
        return mesh;
    };
    
    this.createNode = function (letter) {
        var node = {mark: letter,
                    freq: 0,
                    obj: this.makeMesh3d(),
                    force: new THREE.Vector3(),
                    velocity: new THREE.Vector3()
                   };
        this.nodes.push(node);
        node.dy = Math.random();
        node.animate = function () {
            this.obj.position.y += this.dy;
            if (Math.abs(node.obj.position.y) > 10) {
                this.dy = -this.dy;
            }

        if (graph.animationPhase === 1) {
                this.obj.position.x += this.velocity.x;
                this.obj.position.z += this.velocity.z;
            }
        }
        node.getKineticEnergy = function () {
            return this.velocity.lengthSq();
        }
        return node;
    };

    this.eatLetter = function (letter) {
	letter = letter.toLowerCase();
        if (!(letter >= 'a' && letter <= 'z')) {
            lastLetter = undefined;
            return;
        }

        var node, edge, scalev;

        node = this.getNode(letter);
        if (node === undefined) {
            node = this.createNode(letter);
        }
        node.freq += 1;
        node.obj.scale.addScalar(0.2);

        if (lastLetter !== undefined) {
            edge = this.getEdge(lastLetter + letter);
            if (edge === undefined) {
                edge = this.createEdge(lastLetter + letter);
            }
            edge.freq += 1;
        }

        lastLetter = letter;
    };

    this.animateNodes = function () {
        for (var i in this.nodes) {
            this.nodes[i].animate();
        }
        iterations += 1;
        if (iterations > maxIterations) {
            this.animationPhase = 2;
        }
    };

    this.computeForces = function () {
        var i, j, ipos, jpos, dist, diff, attractionForce, repulsionForce;
        for (i in this.nodes) {
            for (j in this.nodes) {
                if (i !== j) {
                    ipos = this.nodes[i].obj.position;
                    jpos = this.nodes[j].obj.position;
                    attractionForce = this.calcAttractionForce(this.nodes[i], this.nodes[j]);
                    repulsionForce = this.calcRepulsionForce(this.nodes[i], this.nodes[j]);
                    this.nodes[i].force.x += attractionForce.x + repulsionForce.x;
                    this.nodes[i].force.z += attractionForce.z + repulsionForce.z;
                }
            }
        }
    };

    this.applyForces = function () {
        var i, node;
        for (i in this.nodes) {
            node = this.nodes[i];
            node.velocity.x += node.force.x * deltaT;
            node.velocity.z += node.force.z * deltaT;
            node.velocity.multiplyScalar(dampingCoef);
        }
    };

    this.calcAttractionForce = function (node1, node2) {
        var frequency = 0,
        edge1 = this.getEdge(node1.mark+node2.mark),
        edge2 = this.getEdge(node2.mark+node1.mark),
        pos1 = node1.obj.position,
        pos2 = node2.obj.position;
        if (edge1 !== undefined) {
            frequency += edge1.freq;
        }
        if (edge2 !== undefined) {
            frequency += edge2.freq;
        }
        return new THREE.Vector3(pos2.x - pos1.x, 0, pos2.z - pos1.z).multiplyScalar(attractionCoef).multiplyScalar(frequency);
    };

    this.calcRepulsionForce = function (node1, node2) {
        var pos1 = node1.obj.position, pos2 = node2.obj.position;
        var sqdist = Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.z - pos2.z, 2);
        return new THREE.Vector3(pos1.x - pos2.x, 0, pos1.z - pos2.z).
            normalize().
            divideScalar(sqdist).
            multiplyScalar(repulsionCoef);
    };

    this.doPhase1Animation = function () {
        graph.computeForces();
        graph.applyForces();
        graph.animateNodes();
    };

    this.doPhase2Animation = function () {
        graph.animateNodes();
    };
    
    this.doAnimation = function (){
        var animationFunction = this.doPhase1Animation;
        if (this.animationPhase === 2) {
            animationFunction = this.doPhase2Animation;
        }
        animationFunction ();
    };
};

var bulletPool = new function () {
    this.bulletCounter = 0;
    this.bullets = [];

    var createBullet = function () {
        var res = {name: this.bulletCounter,
           obj: make3dBulletMesh()};
        this.bulletCounter += 1;
        //res.obj.visible = false;
        scene.add(res.obj);
        res.setPosition = function (pos) {
            res.obj.position = pos;
        };
        res.setDestination = function (dest) {
            res.destination = dest;
        }
        res.makeStep = function () {
            var diff = new THREE.Vector3(this.destination.x - this.obj.position.x,
                                         0,
                                         this.destination.z - this.obj.position.z).normalize().multiplyScalar(0.0005);
            if (diff.lengthSq() < 0) {
                this.obj.visible = false;
            } else {
                this.obj.position.x += diff.x;
                this.obj.position.z += diff.z;
            }
        }
        return res;
    };
    
    this.getBullet = function () {
        if (this.bullets.length === 0) {
            this.bullets.push(createBullet());
        }
        var res = this.bullets[this.bullets.length - 1];
        this.bullets.pop();
        return res;
    };

    var make3dBulletMesh = function () {
        return new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16), new THREE.MeshBasicMaterial( {color: 0x0000ff} ));
    };

};

init();
animate();

function init() {
    var msg = "Some english text here. Maybe we can do better... anyway, let's start with that for now!abab" +
        "abcdefghijklmnopqrstuvwxyz".toLowerCase(), i;
    for (i = 0; i < msg.length; i += 1) {
        graph.eatLetter(msg.charAt(i));
    }

    container = document.createElement('div');
    document.body.appendChild(container);

    renderer = new THREE.WebGLRenderer();
    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft    = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    var ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    var directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(0.8, 1.5, 0.5).normalize();
    directionalLight.castShadow = true;
    directionalLight.shadowDarkness = 1;
    scene.add(directionalLight);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.x = 200;
    camera.position.y = 400;
    camera.position.z = 500;
    scene.add(camera);

    plane = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200, 240, 240), new THREE.MeshLambertMaterial({color: 0xdddddd}));
    plane.rotation.x = - 90 * Math.PI / 180;
    plane.position.y = -40;
    plane.receiveShadow = true;
    scene.add(plane);
    
    var node;
    for (i in graph.nodes) {
        node = graph.nodes[i];
        node.obj.castShadow = true;
        scene.add(node.obj);
    }
    
}

function animate() {
    requestAnimationFrame( animate );
    render();
}

function render() {
    graph.doAnimation();
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
}

