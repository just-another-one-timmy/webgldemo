var container;
var camera;
var scene;
var renderer;
var cube;

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
	var geometry = new THREE.SphereGeometry(10, 16, 16),
	material = new THREE.MeshLambertMaterial({color: Math.random() * 0xffffff});
	geometry.dynamic = true;
	var mesh = new THREE.Mesh(geometry, material);
	mesh.position.setX((Math.random() - 0.5) * 200);
	mesh.position.setZ((Math.random() - 0.5) * 200);
	mesh.position.setY((Math.random() - 0.5) * 10);
	return mesh;
    };
    
    this.createNode = function(letter) {
	var node = {mark: letter, freq: 0, obj: this.makeMesh3d()};
	this.nodes.push(node);
	node.dy = Math.random()/5;
	node.animate = function () {
	    this.obj.position.y += this.dy;
	    if (Math.abs(node.obj.position.y) > 10) {
		this.dy = -this.dy;
	    }
	}
	
	return node;
    };

    // 
    this.eatLetter = function(letter) {
	var node, edge, scalev;

	node = this.getNode(letter);
	if (node === undefined) {
	    node = this.createNode(letter);
	}
	node.freq += 1;
	node.obj.scale.addScalar(0.2);
	//alert(node.toSource());

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
};

init();
animate();

function init() {
    var msg = "aaabbbcbbba", i;
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
    
    cube = new THREE.Mesh( new THREE.CubeGeometry(20, 20, 20), new THREE.MeshLambertMaterial({color: 0xff0000}));
    scene.add(cube);
}

function animate() {
    requestAnimationFrame( animate );
    render();
}

function render() {
    cube.rotation.y += 0.1;
    graph.animateNodes();
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
}

