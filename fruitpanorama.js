(function(THREE, TWEEN) {

	"use strict";

	function FRUITPANORAMA(options) {

		var _this = this;
		var options = options || {};

		/**
		 * public variables
		 */

		this.container = options.container || document.body;
		this.width = options.width || _this.container.offsetWidth;
		this.height = options.height || _this.container.offsetHeight;
		this.images = options.images || [];
		this.backgroundColor = options.backgroundColor || '';
		this.backgroundImage = options.backgroundImage || '';
		this.backgroundPanorama = options.backgroundPanorama || '';
		this.segments = parseInt(options.segments) || 20;

		this.cameraDistance = options.cameraDistance ? parseInt(options.cameraDistance) : 10;
		this.enableRotation = options.enableRotation === undefined ? true : options.enableRotation;
		this.rotationSpeed = options.rotationSpeed ? parseInt(options.rotationSpeed * 100) / 100 : 5;
		this.autoRotate = options.autoRotate === undefined ? true : options.autoRotate;
		this.autoRotateSpeed = options.autoRotateSpeed ? parseInt(options.autoRotateSpeed * 100) / 100 : 1;
		this.minPolarAngle = options.minPolarAngle ? parseInt(options.minPolarAngle * 1000) / 1000 : 0.001;
		this.maxPolarAngle = options.maxPolarAngle ? parseInt(options.maxPolarAngle * 1000) / 1000 : Math.PI - 0.001;

		this.buttons = ['zoom', 'autoRotate', 'fullScreen'];

		/**
		 * private variables
		 */

		var renderer = new THREE.WebGLRenderer({alpha:true});
		var scene = new THREE.Scene();
		var camera = new THREE.PerspectiveCamera(75, _this.width / _this.height, 0.01, 1000);
		var THEFRUIT = new THREE.Object3D();
		var SPHERES = new THREE.Object3D();
		var EXTRAS = new THREE.Object3D();
		var INTERSECTED = null;

		var cameraLookAt = new THREE.Vector3();
		var cameraDistance = _this.cameraDistance;
		var autoRotate = _this.autoRotate;
		var pointer = new THREE.Vector2(200, 200);
		var raycaster = new THREE.Raycaster();
		var inTheFruit = false;

		var rotationActions = {
			isActive:false,
			phi:0,
			theta:0,
			startPhi:0,
			startTheta:0,
			startX:0,
			startY:0
		};
		var intersectionActions = {
			isMoving:false,
			startX:0,
			startY:0,
			moveX:0,
			moveY:0
		};
		var buttons = {
			container:null,
			zoomPlus:null,
			zoomMinus:null,
			autoRotate:null,
			fullScreen:null,
			goBack:null
		};

		/**
		 * functions for initializing
		 */

		this.addToInit = function() {};
		this.addToRender = function() {};

		this.init = function() {
			_this.container.innerHTML = '';
			renderer.setSize(_this.width, _this.height);
			_this.container.appendChild(renderer.domElement);
			THEFRUIT.add(SPHERES, EXTRAS);
			scene.add(THEFRUIT);
			createBackground();
			createButtons();
			window.addEventListener('resize', onResize);
			renderer.domElement.addEventListener('mousedown', onMouseDown);
			renderer.domElement.addEventListener('mousemove', onMouseMove);
			renderer.domElement.addEventListener('mouseup', onMouseUp);
			renderer.domElement.addEventListener('mouseleave', onMouseUp);
			renderer.domElement.addEventListener('touchstart', onTouchStart);
			renderer.domElement.addEventListener('touchmove', onTouchMove);
			renderer.domElement.addEventListener('touchend', onTouchEnd);
			_this.addToInit();
			render();
		}

		function render() {
			requestAnimationFrame(render);
			TWEEN.update();
			if (autoRotate && !rotationActions.isActive){
				rotationActions.theta += _this.autoRotateSpeed * 0.001;
			}
			if (!intersectionActions.isMoving){
				var phi = (Math.PI / 2) - rotationActions.phi;
				var phi = Math.max(_this.minPolarAngle, Math.min(_this.maxPolarAngle, phi));
				camera.position.setFromSphericalCoords(cameraDistance, phi, rotationActions.theta);
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
				INTERSECTED = intersect[0].object;
			} else {
				INTERSECTED = null;
			}
			_this.addToRender();
			renderer.render(scene, camera);
		}

		/**
		 * create default things
		 */

		function createBackground() {
			if (scene.getObjectByName('background')){
				scene.remove(scene.getObjectByName('background'));
			}
			if (_this.backgroundColor){
				_this.container.style.backgroundImage = 'none';
				_this.container.style.backgroundColor = _this.backgroundColor;
			}
			if (_this.backgroundImage){
				_this.container.style.backgroundImage = 'url(' + _this.backgroundImage + ')';
				_this.container.style.backgroundPosition = 'center';
				_this.container.style.backgroundSize = 'cover';
			}
			if (_this.backgroundPanorama){
				var geometry = new THREE.SphereGeometry(_this.cameraDistance * 10, _this.segments, _this.segments);
				var material = new THREE.MeshBasicMaterial({
					side:THREE.BackSide,
					map:new THREE.TextureLoader().load(_this.backgroundPanorama)
				});
				var bg = new THREE.Mesh(geometry, material);
				bg.name = 'background';
				scene.add(bg);
			}
		}

		function createButtons(){
			var container = document.createElement('div');
			container.className = 'fruitpano-buttons';
			buttons.container = container;
			// zoom
			if (_this.buttons.indexOf('zoom') !== - 1){
				// plus
				var btn = document.createElement('a');
				btn.className = 'fruitpano-zoom-plus';
				btn.innerHTML = 'zp';
				buttons.zoomPlus = btn;
				container.appendChild(btn);
				// minus
				var btn = document.createElement('a');
				btn.className = 'fruitpano-zoom-minus';
				btn.innerHTML = 'zm';
				buttons.zoomMinus = btn;
				btn.addEventListener('click', onClickZoom);
				container.appendChild(btn);
			}
			// auto rotate
			if (_this.buttons.indexOf('autoRotate') !== - 1){
				var btn = document.createElement('a');
				btn.className = 'fruitpano-autorotate';
				btn.innerHTML = 'ar';
				buttons.autoRotate = btn;
				btn.addEventListener('click', onClickAutoRotate);
				container.appendChild(btn);
			}
			// full screen
			if (_this.buttons.indexOf('fullScreen') !== - 1){
				var btn = document.createElement('a');
				btn.className = 'fruitpano-fullscreen';
				btn.innerHTML = 'fs';
				buttons.fullScreen = btn;
				btn.addEventListener('click', onClickFullScreen);
				container.appendChild(btn);
			}
			// go back
			var goBack = document.createElement('a');
			goBack.className = 'fruitpano-goback';
			goBack.innerHTML = 'gb';
			goBack.style.display = 'none';
			buttons.goBack = goBack;
			goBack.addEventListener('click', onClickGoBack);
			container.appendChild(goBack);
			_this.container.appendChild(container);
		}

		this.createFruit = function(nthImg) {
			var geometry = new THREE.SphereGeometry(1, _this.segments, _this.segments);
			var material = new THREE.MeshBasicMaterial({
				side:THREE.DoubleSide
			});
			if (nthImg !== undefined && _this.images[nthImg]){
				material.map = new THREE.TextureLoader().load(_this.images[nthImg]);
			}
			var mesh = new THREE.Mesh(geometry, material);
			return mesh;
		}

		/**
		 * window resize event
		 */

		function onResize() {
			_this.width = options.width || _this.container.offsetWidth;
			_this.height = options.height || _this.container.offsetHeight;
			renderer.setSize(_this.width, _this.height);
			camera.aspect = _this.width / _this.height;
			camera.updateProjectionMatrix();
		}

		/**
		 * mouse events
		 */

		function onMouseDown(e) {
			handleRotationPointerStart(e);
			handleIntersectionPointerStart(e);
		}

		function onMouseMove(e) {
			handleRotationPointerMove(e);
			handleIntersectionPointerMove(e);
		}

		function onMouseUp() {
			handleRotationPointerEnd();
			handleIntersectionPointerEnd();
		}

		/**
		 * touch events
		 */

		function onTouchStart(e) {
			switch (e.touches.length){
				case 1:
					handleRotationPointerStart(e.touches[0]);
					handleIntersectionPointerStart(e.touches[0]);
				break;
			}
		}

		function onTouchMove(e) {
			switch (e.touches.length){
				case 1:
					handleRotationPointerMove(e.touches[0]);
					handleIntersectionPointerMove(e.touches[0]);
				break;
			}
		}

		function onTouchEnd() {
			handleRotationPointerEnd();
			handleIntersectionPointerEnd();
		}

		/**
		 * rotation events handlers
		 */

		function handleRotationPointerStart(e) {
			if (intersectionActions.isMoving)
				return;
			rotationActions.isActive = true;
			rotationActions.startX = e.clientX;
			rotationActions.startY = e.clientY;
			rotationActions.startPhi = rotationActions.phi;
			rotationActions.startTheta = rotationActions.theta;
		}

		function handleRotationPointerMove(e) {
			if (intersectionActions.isMoving || !rotationActions.isActive)
				return;
			rotationActions.phi = (e.clientY - rotationActions.startY) * (_this.rotationSpeed * 0.001) + rotationActions.startPhi;
			rotationActions.theta = (rotationActions.startX - e.clientX) * (_this.rotationSpeed * 0.001) + rotationActions.startTheta;
		}

		function handleRotationPointerEnd() {
			if (intersectionActions.isMoving)
				return;
			rotationActions.isActive = false;
		}

		/**
		 * intersection events handlers
		 */

		function handleIntersectionPointerStart(e) {
			if (inTheFruit)
				return;
			var rect = e.target.getBoundingClientRect();
			var offsetX = e.clientX - rect.left;
			var offsetY = e.clientY - rect.top;
			pointer.x = (offsetX / _this.width) * 2 - 1;
			pointer.y = - (offsetY / _this.height) * 2 + 1;
			intersectionActions.startX = offsetX;
			intersectionActions.startY = offsetY;
			intersectionActions.moveX = offsetX;
			intersectionActions.moveY = offsetY;
		}

		function handleIntersectionPointerMove(e) {
			if (inTheFruit)
				return;
			var rect = e.target.getBoundingClientRect();
			var offsetX = e.clientX - rect.left;
			var offsetY = e.clientY - rect.top;
			intersectionActions.moveX = offsetX;
			intersectionActions.moveY = offsetY;
		}

		function handleIntersectionPointerEnd() {
			if (!INTERSECTED)
				return;
			if (inTheFruit)
				return;
			if (intersectionActions.startX != intersectionActions.moveX || intersectionActions.startY != intersectionActions.moveY)
				return;
			intersectionActions.isMoving = true;
			autoRotate = false;
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
			.to(to, 2000)
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
				autoRotate = _this.autoRotate;
				cameraDistance = 0.001;
				inTheFruit = true;
				buttons.goBack.style.display = 'block';
				INTERSECTED = null;
			})
			.start();
		}

		/**
		 * buttons events
		 */

		function onClickZoom(e) {
			e.preventDefault();
		}

		function onClickAutoRotate(e) {
			e.preventDefault();
			autoRotate = !autoRotate;
		}

		function onClickFullScreen(e) {
			e.preventDefault();
			if (document.fullscreenElement){
				if (document.exitFullscreen)
					document.exitFullscreen();
				else if (document.webkitExitFullscreen)
					document.webkitExitFullscreen();
				else if (document.mozCancelFullScreen)
					document.mozCancelFullScreen();
				else if (document.msExitFullscreen)
					document.msExitFullscreen();
			} else {
				if (_this.container.requestFullscreen)
					_this.container.requestFullscreen();
				else if (_this.container.webkitRequestFullscreen)
					_this.container.webkitRequestFullscreen();
				else if (_this.container.mozRequestFullscreen)
					_this.container.mozRequestFullscreen();
				else if (_this.container.msRequestFullscreen)
					_this.container.msRequestFullscreen();
			}
		}

		function onClickGoBack(e) {
			e.preventDefault();
			intersectionActions.isMoving = true;
			autoRotate = false;
			var cameraPosition = new THREE.Vector3();
			var phi = (Math.PI / 2) - rotationActions.phi;
			cameraPosition.setFromSphericalCoords(_this.cameraDistance, phi, rotationActions.theta);
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
				cx:cameraPosition.x,
				cy:cameraPosition.y,
				cz:cameraPosition.z
			};
			var tween = new TWEEN.Tween(from)
			.to(to, 2000)
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
				autoRotate = _this.autoRotate;
				cameraDistance = _this.cameraDistance;
				inTheFruit = false;
				buttons.goBack.style.display = 'none';
			})
			.start();
		}

		/**
		 *
		 */

		Object.defineProperties(this, {
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
			EXTRAS:{
				get:function() {
					return EXTRAS;
				}
			},
			INTERSECTED:{
				get:function() {
					return INTERSECTED;
				}
			},
			setBackground:{
				value:function(type, value) {
					_this.backgroundColor = '';
					_this.backgroundImage = '';
					_this.backgroundPanorama = '';
					if (type == 'color'){
						_this.backgroundColor = value;
					} else if (type == 'image'){
						_this.backgroundImage = value;
					} else if (type == 'panorama'){
						_this.backgroundPanorama = value;
					}
					createBackground();
				}
			},
			setButtons:{
				value:function(btn) {
					var btn = btn || [];
					buttons.container.innerHTML = '';
					_this.buttons = btn;
					createButtons();
				}
			},
			setTexture:{
				value:function(mesh, texture) {
					if (!mesh)
						return;
					if (!texture){
						mesh.material.map = null;
						mesh.material.needsUpdate = true;
						return;
					}
					if (mesh.material.map){
						mesh.material.map.image.src = texture;
						mesh.material.map.needsUpdate = true;
					} else {
						mesh.material.map = new THREE.TextureLoader().load(texture);
						mesh.material.needsUpdate = true;
					}
				}
			}
		});

	}

	/**
	 * THE GRAPEPANORAMA
	 */

	function GRAPEPANORAMA(options) {

		var _this = this;
		var options = options || {};
		FRUITPANORAMA.call(this, options);
		this.branchColor = options.branchColor || 'brown';
		this.branchTexture = options.branchTexture || '';
		this.enableLeaf = options.enableLeaf === undefined ? true : options.enableLeaf;
		this.leafColor = options.leafColor || 'green';

		var rowOfGrapes = Math.sqrt(_this.images.length);
		var isInt = parseInt(rowOfGrapes) == rowOfGrapes;

		function createGrapes() {
			var nth = 0;
			for (var i = 0; i < rowOfGrapes; i++){
				var numOfGrapesInRow = i * 2 + 1;
				for (var j = 0; j < numOfGrapesInRow; j++){
					var grape = _this.createFruit(nth);
					var radius = numOfGrapesInRow == 1 ? 0 : 2 / (2 * Math.sin(Math.PI / numOfGrapesInRow));
					var phi = 1.5 * Math.PI;
					var theta = (2 * Math.PI / numOfGrapesInRow) * j;
					grape.position.setFromSphericalCoords(radius, phi, theta);
					grape.position.y = numOfGrapesInRow - rowOfGrapes;
					_this.SPHERES.add(grape);
					nth++;
				}
			}
		}

		function createBranch() {
			var geometry = new THREE.TorusGeometry(4, 0.1, _this.segments, _this.segments, Math.PI / 4);
			var material = new THREE.MeshBasicMaterial({
				color:new THREE.Color(_this.branchColor),
				side:THREE.DoubleSide
			});
			if (_this.branchTexture){
				material.color = new THREE.Color(1, 1, 1);
				material.map = new THREE.TextureLoader().load(_this.branchTexture);
			}
			var branch1 = new THREE.Mesh(geometry, material);
			branch1.name = 'branch';
			branch1.position.x = -4;
			var branch2 = new THREE.Mesh(geometry, material);
			branch2.name = 'branch';
			branch2.position.set(-2, 0.7, -3.3);
			branch2.rotation.set(1, 0, 1);
			_this.EXTRAS.add(branch1, branch2);
		}

		function createLeaf() {
			if (!_this.enableLeaf)
				return;
			var geometry = new GrapeLeafGeometry(1, _this.segments);
			var material = new THREE.MeshBasicMaterial({
				color:new THREE.Color(_this.leafColor),
				side:THREE.DoubleSide
			});
			var leaf = new THREE.Mesh(geometry, material);
			leaf.position.set(-0.3, 2.1, 0.7);
			leaf.rotation.set(2.6, 0, -0.7);
			_this.EXTRAS.add(leaf);
		}

		this.addToInit = function() {
			if (!isInt || _this.images.length == 0){
				console.error('');
				return;
			}
			createGrapes();
			createBranch();
			createLeaf();
			_this.SPHERES.position.y = - 1;
			_this.EXTRAS.position.y = rowOfGrapes - 2;
		}

	}

	/**
	 * THE CHERRYPANORAMA
	 */

	function CHERRYPANORAMA(options) {

		var _this = this;
		var options = options || {};
		FRUITPANORAMA.call(this, options);

	}

	/**
	 * THE FRUITBOWLPANORAMA
	 */

	function FRUITBOWLPANORAMA(options) {

		var _this = this;
		var options = options || {};
		FRUITPANORAMA.call(this, options);

	}

	/**
	 * THE CUSTOMPANORAMA
	 */

	function CUSTOMPANORAMA(options) {

		var _this = this;
		var options = options || {};
		FRUITPANORAMA.call(this, options);

	}

	/**
	 * GEOMETRIES
	 */

	function GrapeLeafGeometry(radius, segments) {
		var radius = radius || 1;
		var segments = segments || 10;
		var leaf = new THREE.Shape();
		leaf.moveTo(0, 1 * radius);
		leaf.bezierCurveTo(0, 0.9 * radius, 0.4 * radius, 0.8 * radius, 0.5 * radius, 0.4 * radius);
		leaf.bezierCurveTo(0.6 * radius, 0.5 * radius, 0.8 * radius, 0.55 * radius, 1 * radius, 0.6 * radius);
		leaf.bezierCurveTo(1.1 * radius, 0.5 * radius, 1.4 * radius, -0.9 * radius, 0.5 * radius, -1 * radius);
		leaf.bezierCurveTo(0.2 * radius, -1 * radius, 0.2 * radius, -0.8 * radius, 0, -0.8 * radius);
		leaf.bezierCurveTo(-0.2 * radius, -0.8 * radius, -0.2 * radius, -1 * radius, -0.5 * radius, -1 * radius);
		leaf.bezierCurveTo(-1.4 * radius, -0.9 * radius, -1.1 * radius, 0.5 * radius, -1 * radius, 0.6 * radius);
		leaf.bezierCurveTo(-0.8 * radius, 0.55 * radius, -0.6 * radius, 0.5 * radius, -0.5 * radius, 0.4 * radius);
		leaf.bezierCurveTo(-0.4 * radius, 0.8 * radius, 0, 0.9 * radius, 0, 1 * radius);
		var geometry = new THREE.ShapeGeometry(leaf, segments);
		return geometry;
	}

	function CherryLeafGeometry(radius, segments) {
		var radius = radius || 1;
		var segments = segments || 10;
		var leaf = new THREE.Shape();
		leaf.moveTo(0, 1 * radius);
		leaf.bezierCurveTo(0.1 * radius, 0.5 * radius, 0.7 * radius, -0.5 * radius, 0, -1 * radius);
		leaf.bezierCurveTo(-0.7 * radius, -0.5 * radius, -0.1 * radius, 0.5 * radius, 0, 1 * radius);
		var geometry = new THREE.ShapeGeometry(leaf, segments);
		return geometry;
	}

	function BowlGeometry(radius, segments) {
		var radius = radius || 1;
		var segments = segments || 10;
		var points = [
			new THREE.Vector2(0, 0),
			new THREE.Vector2(1 * radius, 0)
		];
		for (var i = 0; i < 8; i++){
			points.push(new THREE.Vector2(Math.sin(i * 0.2) * (1.5 * radius) + radius, (i + radius) * (0.15 * radius)));
		}
		var bowl = new THREE.LatheGeometry(points, segments);
		return bowl;
	}

	GRAPEPANORAMA.prototype = Object.create(FRUITPANORAMA.prototype);
	GRAPEPANORAMA.prototype.constructor = GRAPEPANORAMA;

	window.FRUITPANORAMA = {};
	window.FRUITPANORAMA.GRAPE = GRAPEPANORAMA;
	window.FRUITPANORAMA.CHERRY = CHERRYPANORAMA;
	window.FRUITPANORAMA.FRUITBOWL = FRUITBOWLPANORAMA;
	window.FRUITPANORAMA.CUSTOM = CUSTOMPANORAMA;

})(THREE, TWEEN);
