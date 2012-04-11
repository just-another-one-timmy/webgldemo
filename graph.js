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
var maxIterations = 150, iterations = 0;
var bulletDeltaT = 0.0001;
var bulletAttractionCoef = 15;
var bulletEpsilon = 1.5;

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
        var i, j, nodei, nodej, edge, freq;
        for (i in graph.nodes) {
            for (j in graph.nodes) {
                nodei = graph.nodes[i];
                nodej = graph.nodes[j];
                edge = graph.getEdge(nodei.mark + nodej.mark);
                freq = 1;
                if (edge !== undefined) {
                    freq = edge.freq;
                }
                if ((Math.random() > 0.97) && (freq*Math.random() > 0.95)) {
                    bulletPool.makeBullet(nodei, nodej);
                }
            }
        }
        bulletPool.animateBullets();
    };
    
    this.doAnimation = function (){
        var animationFunction = this.doPhase1Animation;
        if (this.animationPhase === 2) {
            animationFunction = this.doPhase2Animation;
        }
        animationFunction();
    };
};

var Bullet = function () {

    var obj = undefined;
    var destObj = undefined;
    var velocity = new THREE.Vector3();
    var force    = new THREE.Vector3();

    this.setObject = function (object) {
        obj = object;
    };

    this.setPosition = function (position) {
        obj.position = position;
    };

    this.setDestinationObject = function (destinationObject) {
        destObj = destinationObject;
        destObj.geometry.computeBoundingSphere();
    };

    var signedSquare = function (x) {
        var res = x*x;
        if (x < 0) {
            res *= -1;
        }
        return res;
    };
    
    this.calculateForce = function () {
        force.set(destObj.position.x - obj.position.x,
                  destObj.position.y - obj.position.y,
                  destObj.position.z - obj.position.z)
            .multiplyScalar(bulletAttractionCoef);
    };

    this.applyForce = function () {
        velocity.x += force.x * bulletDeltaT;
        velocity.y += force.y * bulletDeltaT;
        velocity.z += force.z * bulletDeltaT;
    };

    this.makeStep = function () {
        obj.position.x += velocity.x;
        obj.position.y += velocity.y;
        obj.position.z += velocity.z;
    };

    this.hasArrived = function () {
        var diff = Math.pow(obj.position.x - destObj.position.x, 2);
        diff += Math.pow(obj.position.z - destObj.position.z, 2);
        return diff < Math.pow(destObj.geometry.boundingSphere.radius, 2) + bulletEpsilon;
    };

    this.deactivate = function () {
        destObj = obj;
        obj.visible = false;
        force.set(0, 0, 0);
        velocity.set(0, 0, 0);
    };

    this.activate = function (position, color) {
        obj.visible = true;
        obj.position.set(position.x, position.y, position.z);
        obj.material.color = color;
        //velocity.x = 0.015 * (Math.random() - 0.5) * (position.x - destObj.position.x);
        //velocity.z = 0.015 * (Math.random() - 0.5) * (position.z - destObj.position.z);
        velocity.y = Math.random()/4;
    };

};

var bulletPool = new function () {

    var maxBulletsCnt = 100;
    var bulletsCnt = 0;
    var bullets = [];
    var activeBullets = [];
    var temporaryBucket = [];

    this.makeBullet = function (nodeFrom, nodeTo) {
        var bullet;
        if (bullets.length === 0) {
            if (bulletsCnt < maxBulletsCnt) {
                bullets.push(new Bullet());
                bulletsCnt += 1;
            } else {
                //////////////////////////////
                return;
            }
        }
        bullet = bullets.pop();
        bullet.setObject( this.makeBulletSphere() );
        bullet.setDestinationObject(nodeTo.obj);
        bullet.activate(nodeFrom.obj.position, nodeFrom.obj.material.color);
        activeBullets.push(bullet);
        return bullet;
    };

    this.makeBulletSphere = function () {
        var geometry = new THREE.SphereGeometry(6, 8, 8);
        var material = new THREE.MeshBasicMaterial({color: 0xff0000});
        var mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        return mesh;
    };

    this.animateBullets = function () {
        var bullet, i, tmp;
        temporaryBucket.length = 0;
        for (i in activeBullets) {
            bullet = activeBullets[i];
            if (bullet.hasArrived()) {
                bullet.deactivate();
                bullets.push(bullet);
            } else {
                bullet.calculateForce();
                bullet.applyForce();
                bullet.makeStep();
                temporaryBucket.push(bullet);
            }
        }
        tmp = activeBullets;
        activeBullets = temporaryBucket;
        temporaryBucket = tmp;
        console.log('activeBullets.length = ' + activeBullets.length);
    };

};

init();
animate();

function init() {
    var msg = "Some english text here. Maybe we can do better... anyway, let's start with that for now!abab" +
        "abcdefghijklmnopqrstuvwxyz".toLowerCase();
    var i;
    for (i = 0; i < msg.length; i += 1) {
        graph.eatLetter(msg.charAt(i));
    }

    container = document.createElement('div');
    document.body.appendChild(container);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    var ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    var directionalLightRight = new THREE.DirectionalLight(0xffffff);
    directionalLightRight.position.set(750, 900, 200).normalize();
    scene.add(directionalLightRight);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.x = 200;
    camera.position.y = 400;
    camera.position.z = 500;
    scene.add(camera);

    plane = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200, 200, 200), new THREE.MeshLambertMaterial({color: 0xdddddd}));
    plane.rotation.x = - 90 * Math.PI / 180;
    plane.position.y = -40;
    scene.add(plane);
    
    var node;
    for (i in graph.nodes) {
        node = graph.nodes[i];
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

