var container;
var camera;
var scene;
var renderer;
var cube;

init();
animate();

function init() {
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
    camera.position.x = 0;
    camera.position.y = 200;
    camera.position.z = 500;
    scene.add(camera);

    cube = new THREE.Mesh( new THREE.CubeGeometry(20, 20, 20), new THREE.MeshLambertMaterial({color: 0xff0000}));
    scene.add(cube);
}

function animate() {
    requestAnimationFrame( animate );
    render();
}

function render() {
    cube.rotation.y += 0.1;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
}

