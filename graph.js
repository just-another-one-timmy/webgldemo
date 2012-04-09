var container;
var camera;
var scene;
var renderer;
var cube;
var repulsionCoef = 20;
var attractionCoef = .000006;
var dampingCoef = 0.5;
var cameraStepSize = 5;

document.onkeydown = function(event) {
    switch (String.fromCharCode(event.which).toLowerCase()) {
    case "a": camera.position.x -= cameraStepSize; break;
    case "d": camera.position.x += cameraStepSize; break;
    case "w": camera.position.z -= cameraStepSize; break;
    case "s": camera.position.z += cameraStepSize; break;
    case "f": camera.position.y -= cameraStepSize; break;
    case "r": camera.position.y += cameraStepSize; break;
    }
}

var graph = new function() {
    // for each letter stores it frequency in the text and 3d object to display
    this.nodes = [];
    // for each pair of letters stores it frequency in the text
    this.edges = [];

    var lastLetter = undefined;
    
    this.getEdge = function(mark) {
	var i, edge;
	for (i in this.edges) {
	    edge = this.edges[i];
	    if (edge.mark === mark) {
		return edge;
	    }
	}
    };

    this.getNode = function(letter) {
	var i, node;
	for (i in this.nodes) {
	    node = this.nodes[i];
	    if (node.mark === letter) {
		return node;
	    }
	}
	return undefined;
    };

    this.createEdge = function(mark) {
	var edge = {mark: mark, freq: 0};
	this.edges.push(edge);
	return edge;
    };

    this.makeMesh3d = function() {
	var geometry = new THREE.SphereGeometry(10, 32, 32),
	material = new THREE.MeshLambertMaterial({color: Math.random() * 0xffffff});
	geometry.dynamic = true;
	var mesh = new THREE.Mesh(geometry, material);
	mesh.position.setX((Math.random() - 0.5) * 200);
	mesh.position.setZ((Math.random() - 0.5) * 200);
	mesh.position.setY((Math.random() - 0.5) * 10);
	return mesh;
    };
    
    this.createNode = function(letter) {
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
            this.obj.position.x += this.velocity.x;
            this.obj.position.z += this.velocity.z;
	}
	
	return node;
    };

    // 
    this.eatLetter = function(letter) {

	if (!(letter >= 'a' && letter <= 'z')) {
	    lastLetter = undefined;
	}
	
	var node, edge, scalev;

	node = this.getNode(letter);
	if (node === undefined) {
	    node = this.createNode(letter);
	}
	node.freq += 1;
	node.obj.scale.addScalar(0.2);

	if (lastLetter !== undefined) {
	    edge = this.getEdge();
	    if (edge === undefined) {
		edge = this.createEdge(lastLetter + letter);
	    }
	    edge.freq += 1;
	    //alert(edge.toSource());
	}
	
	lastLetter = letter;
    };

    this.animateNodes = function() {
	for (var i in this.nodes) {
	    this.nodes[i].animate();
	}
    };

    this.computeForces = function() {
	var i, j, ipos, jpos, dist, diff, attractionForce, repulsionForce;
	for (i in this.nodes) {
	    for (j in this.nodes) {
		if (i !== j) {
		    ipos = this.nodes[i].obj.position;
		    jpos = this.nodes[j].obj.position;
                    attractionForce = this.calcAttractionForce(ipos, jpos);
                    repulsionForce = this.calcRepulsionForce(ipos, jpos);
                    this.nodes[i].force.x += attractionForce.x + repulsionForce.x;
                    this.nodes[i].force.z += attractionForce.z + repulsionForce.z;
		}
	    }
	}
    };

    this.applyForces = function() {
	var i, node;
        for (i in this.nodes) {
            node = this.nodes[i];
            node.velocity.x += node.force.x;
            node.velocity.z += node.force.z;
            node.velocity.multiplyScalar(dampingCoef);
        }
    };

    this.calcAttractionForce = function(pos1, pos2) {
        return new THREE.Vector3(pos2.x - pos1.x, 0, pos2.z - pos1.z).multiplyScalar(attractionCoef);
    };

    this.calcRepulsionForce = function(pos1, pos2) {
        var sqdist = Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.z - pos2.z, 2);
        return new THREE.Vector3(pos1.x - pos2.x, 0, pos1.z - pos2.z).
            normalize().
            divideScalar(sqdist).
            multiplyScalar(repulsionCoef);
    };

    this.doAnimation = function(){
        for (var i = 0; i < 10; i++) {
            graph.computeForces();
            graph.applyForces();
        }
        graph.animateNodes();
    };
};

init();
animate();

function init() {
    var msg = "Some english text here. Maybe we can do better... anyway, let's start with that for now!".toLowerCase(), i;
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

    var directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(1, 1, 0).normalize();
    scene.add(directionalLight);


    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.x = 200;
    camera.position.z = 500;
    scene.add(camera);

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

