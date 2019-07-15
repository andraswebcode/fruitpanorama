(function(THREE, TWEEN) {

	"use strict";

	function FRUITPANORAMA(options) {

		var _this = this;
		var options = options || {};

		this.container = options.container || document.body;
		this.width = options.width || _this.container.offsetWidth;
		this.height = options.height || _this.container.offsetHeight;
		this.images = options.images || [];
		this.background = options.background;
		this.segments = options.segments || 20;
		this.cameraDistance = options.cameraDistance || 10;
		this.autoRotate = options.autoRotate === undefined ? true : options.autoRotate;
		this.autoRotateSpeed = options.autoRotateSpeed || 0.001;
		this.rotationSpeed = options.rotationSpeed || 0.005;
		this.cameraSpeed = options.cameraSpeed || 2000;
		this.cameraFov = options.cameraFov || 75;
		this.minPolarAngle = options.minPolarAngle || 0.001;
		this.maxPolarAngle = options.maxPolarAngle || Math.PI - 0.001;
		this.buttons = options.buttons || {};

		var renderer = new THREE.WebGLRenderer({alpha:true});
		var scene = new THREE.Scene();
		var camera = new THREE.PerspectiveCamera(_this.cameraFov, _this.width / _this.height, 0.01, 1000);
		var THEFRUIT = new THREE.Object3D();
		var INTERSECTED = null;
		var SPHERES = new THREE.Object3D();
		var OTHERS = new THREE.Object3D();

		var cameraLookAt = new THREE.Vector3();
		var cameraDistance = _this.cameraDistance;
		var pointer = new THREE.Vector2(200, 200);
		var raycaster = new THREE.Raycaster();
		var inTheSphere = false;
		var fruitpanoInTheSphere = new Event('fruitpanoInTheSphere');
		var fruitpanoOutTheSphere = new Event('fruitpanoOutTheSphere');
		var rotationActions = {
			isActive:false,
			startX:0,
			lon:0,
			startLon:0,
			startY:0,
			lat:0,
			startLat:0
		};
		var intersectionActions = {
			startX:0,
			startY:0,
			moveX:0,
			moveY:0,
			autoRotate:_this.autoRotate,
			isMoving:false
		};
		var buttons = {
			goBack:null,
			zoom:null,
			autoRotate:null,
			fullScreen:null
		};

		function createBackground() {
			if (_this.background === undefined)
				return;
			var radius = cameraDistance * 2;
			var geometry = new THREE.SphereGeometry(radius, _this.segments, _this.segments);
			var material = new THREE.MeshBasicMaterial();
			material.side = THREE.BackSide;
			material.map = new THREE.TextureLoader().load(_this.background);
			var bg = new THREE.Mesh(geometry, material);
			scene.add(bg);
		}

		function createButtons() {
			var container = document.createElement('div');
			container.className = 'fruitpano-buttons';
			// go back
			var goBack = document.createElement('a');
			goBack.className = 'fruitpano-goback';
			goBack.innerHTML = 'go back';
			goBack.style.display = 'none';
			buttons.goBack = goBack;
			container.appendChild(goBack);
			// zoom
			if (_this.buttons.zoom){
				var btn = document.createElement('a');
				btn.className = 'fruitpano-zoom';
				btn.innerHTML = 'zoom';
				buttons.zoom = btn;
				container.appendChild(btn);
			}
			// auto rotate
			if (_this.buttons.autoRotate){
				var btn = document.createElement('a');
				btn.className = 'fruitpano-autorotate';
				btn.innerHTML = 'auto rotate';
				buttons.autoRotate = btn;
				container.appendChild(btn);
			}
			// full screen
			if (_this.buttons.fullScreen){
				var btn = document.createElement('a');
				btn.className = 'fruitpano-fullscreen';
				btn.innerHTML = 'full screen';
				buttons.fullScreen = btn;
				container.appendChild(btn);
			}
			_this.container.appendChild(container);
		}

		this.addToInit = function() {};
		this.addToRender = function() {};

		this.init = function() {
			_this.container.innerHTML = '';
			renderer.setSize(_this.width, _this.height);
			//renderer.setClearColor(0x000000, 0);
			_this.container.appendChild(renderer.domElement);
			THEFRUIT.add(_this.SPHERES, _this.OTHERS);
			scene.add(THEFRUIT);
			createBackground();
			createButtons();
			_this.addToInit();
			window.addEventListener('resize', onResize);
			_this.container.addEventListener('mousedown', onPointerStart);
			_this.container.addEventListener('mousemove', onPointerMove);
			_this.container.addEventListener('mouseup', onPointerEnd);
			_this.container.addEventListener('mouseleave', onPointerEnd);
			_this.container.addEventListener('touchstart', onPointerStart);
			_this.container.addEventListener('touchmove', onPointerMove);
			_this.container.addEventListener('touchend', onPointerEnd);
			_this.container.addEventListener('fruitpanoInTheSphere', onInTheSphere);
			_this.container.addEventListener('fruitpanoOutTheSphere', onOutTheSphere);
			buttons.goBack.addEventListener('click', onClickGoBack);
			render();
		};

		function render() {
			requestAnimationFrame(render);
			TWEEN.update();
			if (!rotationActions.isActive && _this.autoRotate && intersectionActions.autoRotate){
				rotationActions.lon += _this.autoRotateSpeed;
			}
			if (!intersectionActions.isMoving){
				var phi = (Math.PI / 2) - rotationActions.lat;
				var phi = Math.max(_this.minPolarAngle, Math.min(_this.maxPolarAngle, phi));
				var theta = rotationActions.lon;
				camera.position.setFromSphericalCoords(cameraDistance, phi, theta);
				camera.position.set(
					camera.position.x + cameraLookAt.x,
					camera.position.y + cameraLookAt.y,
					camera.position.z + cameraLookAt.z
				);
			}
			camera.lookAt(cameraLookAt);
			raycaster.setFromCamera(pointer, camera);
			var intersect = raycaster.intersectObjects(_this.SPHERES.children);
			if (intersect.length){
				INTERSECTED = intersect[0].object
			} else {
				INTERSECTED = null;
			}
			_this.addToRender();
			renderer.render(scene, camera);
		}

		function onResize() {
			_this.width = options.width || _this.container.offsetWidth;
			_this.height = options.height || _this.container.offsetHeight;
			renderer.setSize(_this.width, _this.height);
			camera.aspect = _this.width / _this.height;
			camera.updateProjectionMatrix();
		}

		function onPointerStart(e) {
			var _e = 'ontouchstart' in window ? e.touches[0] : e;
			handleRotationPointerStart(_e);
			handleIntersectionPointerStart(_e);
		}

		function onPointerMove(e) {
			var _e = 'ontouchstart' in window ? e.touches[0] : e;
			handleRotationPointerMove(_e);
			handleIntersectionPointerMove(_e);
		}

		function onPointerEnd() {
			handleRotationPointerEnd();
			handleIntersectionPointerEnd();
		}

		function onInTheSphere() {
			inTheSphere = true;
			buttons.goBack.style.display = 'block';
		}

		function onOutTheSphere() {
			inTheSphere = false;
			buttons.goBack.style.display = 'none';
		}

		function handleRotationPointerStart(e) {
			if (intersectionActions.isMoving)
				return;
			rotationActions.isActive = true;
			rotationActions.startX = e.clientX;
			rotationActions.startY = e.clientY;
			rotationActions.startLon = rotationActions.lon;
			rotationActions.startLat = rotationActions.lat;
		}

		function handleRotationPointerMove(e) {
			if (intersectionActions.isMoving)
				return;
			if (!rotationActions.isActive)
				return;
			rotationActions.lon = ( rotationActions.startX - e.clientX ) * _this.rotationSpeed + rotationActions.startLon;
			rotationActions.lat = ( e.clientY - rotationActions.startY ) * _this.rotationSpeed + rotationActions.startLat;
		}

		function handleRotationPointerEnd() {
			if (intersectionActions.isMoving)
				return;
			rotationActions.isActive = false;
		}

		function handleIntersectionPointerStart(e) {
			var bounding = e.target.getBoundingClientRect();
			var offsetX = e.clientX - bounding.left;
			var offsetY = e.clientY - bounding.top;
			intersectionActions.startX = offsetX;
			intersectionActions.startY = offsetY;
		}

		function handleIntersectionPointerMove(e) {
			var bounding = e.target.getBoundingClientRect();
			var offsetX = e.clientX - bounding.left;
			var offsetY = e.clientY - bounding.top;
			pointer.x = (offsetX / _this.width) * 2 - 1;
			pointer.y = - (offsetY / _this.height) * 2 + 1;
			intersectionActions.moveX = offsetX;
			intersectionActions.moveY = offsetY;
		}

		function handleIntersectionPointerEnd() {
			if (intersectionActions.startX != intersectionActions.moveX || intersectionActions.startY != intersectionActions.moveY)
				return;
			if (!INTERSECTED || inTheSphere)
				return;
			if (INTERSECTED && _this.autoRotate){
				intersectionActions.autoRotate = false;
			}
			intersectionActions.isMoving = true;
			var intersected = INTERSECTED;
			var intersectedPosition = intersected.getWorldPosition(new THREE.Vector3());
			var from = {
				lx:cameraLookAt.x,
				ly:cameraLookAt.y,
				lz:cameraLookAt.z,
				cx:camera.position.x,
				cy:camera.position.y,
				cz:camera.position.z
			};
			var to = {
				lx:intersectedPosition.x,
				ly:intersectedPosition.y,
				lz:intersectedPosition.z,
				cx:intersectedPosition.x,
				cy:intersectedPosition.y,
				cz:intersectedPosition.z
			};
			var tween = new TWEEN.Tween(from)
			.to(to, _this.cameraSpeed)
			.easing(TWEEN.Easing.Cubic.InOut)
			.onUpdate(function(move) {
				cameraLookAt.x = move.lx;
				cameraLookAt.y = move.ly;
				cameraLookAt.z = move.lz;
				camera.position.x = move.cx;
				camera.position.y = move.cy;
				camera.position.z = move.cz;
			})
			.onComplete(function() {
				intersectionActions.isMoving = false;
				intersectionActions.autoRotate = true;
				cameraDistance = 0.001;
				_this.container.dispatchEvent(fruitpanoInTheSphere);
			})
			.start();
		}

		function onClickGoBack(e) {
			e.preventDefault();
			if (_this.autoRotate){
				intersectionActions.autoRotate = false;
			}
			intersectionActions.isMoving = true;
			var camPos = new THREE.Vector3();
			var phi = (Math.PI / 2) - rotationActions.lat;
			var theta = rotationActions.lon;
			camPos.setFromSphericalCoords(_this.cameraDistance, phi, theta);
			var from = {
				lx:cameraLookAt.x,
				ly:cameraLookAt.y,
				lz:cameraLookAt.z,
				cx:camera.position.x,
				cy:camera.position.y,
				cz:camera.position.z
			};
			var to = {
				lx:0,
				ly:0,
				lz:0,
				cx:camPos.x,
				cy:camPos.y,
				cz:camPos.z
			};
			var tween = new TWEEN.Tween(from)
			.to(to, _this.cameraSpeed)
			.easing(TWEEN.Easing.Cubic.InOut)
			.onUpdate(function(move) {
				cameraLookAt.x = move.lx;
				cameraLookAt.y = move.ly;
				cameraLookAt.z = move.lz;
				camera.position.x = move.cx;
				camera.position.y = move.cy;
				camera.position.z = move.cz;
			})
			.onComplete(function() {
				intersectionActions.isMoving = false;
				intersectionActions.autoRotate = true;
				cameraDistance = _this.cameraDistance;
				_this.container.dispatchEvent(fruitpanoOutTheSphere);
			})
			.start();
		}

		Object.defineProperties(this, {
			changeCameraDistance:{
				value:function() {
					cameraDistance = _this.cameraDistance;
				},
				writeable:false
			},
			camera:{
				get:function() {
					return camera;
				}
			},
			SPHERES:{
				get:function() {
					return SPHERES;
				}
			},
			OTHERS:{
				get:function() {
					return OTHERS;
				}
			},
			INTERSECTED:{
				get:function() {
					return INTERSECTED;
				}
			}
		});

	}

	/**
	 * THE GRAPEPANORAMA
	 */

	function GRAPEPANORAMA(options) {

		var _this = this;
		FRUITPANORAMA.call(this, options);
		this.branchTexture = options.branchTexture;

		var rowsOfGrapes = Math.sqrt(_this.images.length);

		function createGrapes() {
			var isInt = parseInt(rowsOfGrapes) == rowsOfGrapes;
			if (!isInt){
				console.error('');
				return false;
			}
			var nth = 0;
			for (var i = 0; i < rowsOfGrapes; i++){
				var numOfGrapesInRow = i * 2 + 1;
				for (var j = 0; j < numOfGrapesInRow; j++){
					var geometry = new THREE.SphereGeometry(1, _this.segments, _this.segments);
					var material = new THREE.MeshBasicMaterial();
					material.side = THREE.DoubleSide;
					if (_this.images[nth]){
						material.map = new THREE.TextureLoader().load(_this.images[nth]);
					}
					var grape = new THREE.Mesh(geometry, material);
					var radius = numOfGrapesInRow == 1 ? 0 : 2 / (2 * Math.sin(Math.PI / numOfGrapesInRow));
					var phi = 1.5 * Math.PI;
					var theta = (2 * Math.PI / numOfGrapesInRow) * j;
					grape.position.setFromSphericalCoords(radius, phi, theta);
					grape.position.y = numOfGrapesInRow - rowsOfGrapes;
					_this.SPHERES.add(grape);
					nth++;
				}
			}
		}
		function createBranch() {
			var geometry = new THREE.TorusGeometry(4, 0.1, _this.segments, _this.segments, Math.PI / 4);
			var material = new THREE.MeshBasicMaterial();
			if (_this.branchTexture !== undefined){
				material.map = new THREE.TextureLoader().load(_this.branchTexture);
			}
			var branch1 = new THREE.Mesh(geometry, material);
			branch1.position.x = -4;
			var branch2 = new THREE.Mesh(geometry, material);
			branch2.position.set(-2, 0.7, -3.3);
			branch2.rotation.set(1, 0, 1);
			_this.OTHERS.add(branch1, branch2);
		}
		this.addToInit = function() {
			createGrapes();
			createBranch();
			_this.SPHERES.position.y = - 1;
			_this.OTHERS.position.y = rowsOfGrapes - 2;
		}

	}

	GRAPEPANORAMA.prototype = Object.create(FRUITPANORAMA.prototype);
	GRAPEPANORAMA.prototype.constructor = GRAPEPANORAMA;

	/**
	 * THE CHERRYPANORAMA
	 */

	function CHERRYPANORAMA(options) {

		var _this = this;
		FRUITPANORAMA.call(this, options);
		this.branchTexture = options.branchTexture;

		var nOfCherries = _this.images.length;
		var distance = 0.1;

		function createCherry() {
			for (var i = 0; i < nOfCherries; i++){
				var geometry = new THREE.SphereGeometry(1, _this.segments, _this.segments);
				var material = new THREE.MeshBasicMaterial();
				material.side = THREE.DoubleSide;
				if (_this.images[i]){
					material.map = new THREE.TextureLoader().load(_this.images[i]);
				}
				var cherry = new THREE.Mesh(geometry, material);
				var radius = nOfCherries == 1 ? 0 : 2 / (2 * Math.sin(Math.PI / nOfCherries)) + distance;
				var phi = 1.5 * Math.PI;
				var theta = (2 * Math.PI / nOfCherries) * i + (Math.PI / 2);
				cherry.position.setFromSphericalCoords(radius, phi, theta);
				_this.SPHERES.add(cherry);
			}
		}

		function createBranch() {
			for (var i = 0; i < nOfCherries; i++){
				var geometry = new THREE.TorusGeometry(4, 0.1, _this.segments, _this.segments, Math.PI / 4);
				var material = new THREE.MeshBasicMaterial();
				if (_this.branchTexture !== undefined){
					material.map = new THREE.TextureLoader().load(_this.branchTexture);
				}
				var branch = new THREE.Mesh(geometry, material);
				var radius = (nOfCherries == 1 ? 0 : 2 / (2 * Math.sin(Math.PI / nOfCherries)) + distance) - 4;
				var phi = 1.5 * Math.PI;
				var theta = (2 * Math.PI / nOfCherries) * i + (Math.PI / 2);
				branch.position.setFromSphericalCoords(radius, phi, theta);
				branch.rotation.y = ((Math.PI * 2) / nOfCherries * i) + Math.PI;
				_this.OTHERS.add(branch);
			}
		}

		this.addToInit = function() {
			createCherry();
			createBranch();
		};

	}

	CHERRYPANORAMA.prototype = Object.create(FRUITPANORAMA.prototype);
	CHERRYPANORAMA.prototype.constructor = CHERRYPANORAMA;

	/**
	 * THE CUSTOMPANORAMA
	 */

	function CUSTOMPANORAMA(options) {
		FRUITPANORAMA.call(this);
	}

	CUSTOMPANORAMA.prototype = Object.create(FRUITPANORAMA.prototype);
	CUSTOMPANORAMA.prototype.constructor = CUSTOMPANORAMA;

	window.FRUITPANORAMA = {};
	window.FRUITPANORAMA.GRAPE = GRAPEPANORAMA;
	window.FRUITPANORAMA.CHERRY = CHERRYPANORAMA;
	window.FRUITPANORAMA.CUSTOM = CUSTOMPANORAMA;

})(THREE, TWEEN);
