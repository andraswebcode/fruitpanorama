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
		this.background = options.background;
		this.segments = options.segments || 20;
		this.cameraDistance = options.cameraDistance ? parseInt(options.cameraDistance * 10) / 10 : 10;
		this.autoRotate = options.autoRotate === undefined ? true : options.autoRotate;
		this.autoRotateSpeed = options.autoRotateSpeed ? parseInt(options.autoRotateSpeed * 1000) / 1000 : 0.001;
		this.rotationSpeed = options.rotationSpeed ? parseInt(options.rotationSpeed * 1000) / 1000 : 0.005;
		this.cameraSpeed = options.cameraSpeed || 2000;
		this.cameraFov = options.cameraFov || 75;
		this.zoomSpeed = options.zoomSpeed ? parseInt(options.zoomSpeed * 1000) / 1000 : 0.01;
		this.zoomMin = options.zoomMin ? parseInt(options.zoomMin * 100) / 100 : 0.4;
		this.zoomMax = options.zoomMax ? parseInt(options.zoomMax * 100) / 100 : 4;
		this.minPolarAngle = options.minPolarAngle ? parseInt(options.minPolarAngle * 1000) / 1000 : 0.001;
		this.maxPolarAngle = options.maxPolarAngle ? parseInt(options.maxPolarAngle * 1000) / 1000 : Math.PI - 0.001;
		this.buttons = options.buttons || ['zoom', 'autoRotate', 'fullScreen'];
		this.SVGDirectory = options.SVGDirectory || '/svg/';

		/**
		 * private variables
		 */

		var renderer = new THREE.WebGLRenderer({alpha:true});
		var scene = new THREE.Scene();
		var camera = new THREE.PerspectiveCamera(_this.cameraFov, _this.width / _this.height, 0.01, 1000);
		var THEFRUIT = new THREE.Object3D();
		var INTERSECTED = null;
		var SPHERES = new THREE.Object3D();
		var EXTRAS = new THREE.Object3D();

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
		var zoomingActions = {
			isZoomingPlus:false,
			isZoomingMinus:false,
			fingersDistance:0
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
			zoomPlus:null,
			zoomMinus:null,
			autoRotate:null,
			fullScreen:null,
			goBack:null
		};
		var buttonsActions = {
			autoRotate:_this.autoRotate
		};

		/**
		 * create default elements
		 */

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
			// zoom
			if (_this.buttons.indexOf('zoom') !== - 1){
				// plus
				var btn = document.createElement('a');
				btn.className = 'fruitpano-zoom-plus';
				btn.innerHTML = '<img src="' + _this.SVGDirectory + 'search-plus.svg">';
				buttons.zoomPlus = btn;
				container.appendChild(btn);
				// minus
				var btn = document.createElement('a');
				btn.className = 'fruitpano-zoom-minus';
				btn.innerHTML = '<img src="' + _this.SVGDirectory + 'search-minus.svg">';
				buttons.zoomMinus = btn;
				container.appendChild(btn);
			}
			// auto rotate
			if (_this.buttons.indexOf('autoRotate') !== - 1){
				var btn = document.createElement('a');
				btn.className = 'fruitpano-autorotate';
				btn.innerHTML = '<img src="' + _this.SVGDirectory + 'redo-alt.svg">';
				buttons.autoRotate = btn;
				container.appendChild(btn);
			}
			// full screen
			if (_this.buttons.indexOf('fullScreen') !== - 1){
				var btn = document.createElement('a');
				btn.className = 'fruitpano-fullscreen';
				btn.innerHTML = '<img src="' + _this.SVGDirectory + 'expand.svg">';
				buttons.fullScreen = btn;
				container.appendChild(btn);
			}
			// go back
			var goBack = document.createElement('a');
			goBack.className = 'fruitpano-goback';
			goBack.innerHTML = '<img src="' + _this.SVGDirectory + 'sign-out-alt.svg">';
			goBack.style.display = 'none';
			buttons.goBack = goBack;
			container.appendChild(goBack);
			_this.container.appendChild(container);
		}

		/**
		 * functions for initializing
		 */

		this.addToInit = function() {};
		this.addToRender = function() {};

		this.init = function() {
			_this.container.innerHTML = '';
			_this.container.className = 'fruitpano-container'
			renderer.setSize(_this.width, _this.height);
			_this.container.appendChild(renderer.domElement);
			THEFRUIT.add(_this.SPHERES, _this.EXTRAS);
			scene.add(THEFRUIT);
			createBackground();
			createButtons();
			_this.addToInit();
			window.addEventListener('resize', onResize);
			renderer.domElement.addEventListener('mousedown', onMouseDown);
			renderer.domElement.addEventListener('mousemove', onMouseMove);
			renderer.domElement.addEventListener('mouseup', onMouseUp);
			renderer.domElement.addEventListener('mouseleave', onMouseUp);
			renderer.domElement.addEventListener('wheel', handleZoomingMouseWheel);
			renderer.domElement.addEventListener('touchstart', onTouchStart);
			renderer.domElement.addEventListener('touchmove', onTouchMove);
			renderer.domElement.addEventListener('touchend', onTouchEnd);
			_this.container.addEventListener('fruitpanoInTheSphere', onInTheSphere);
			_this.container.addEventListener('fruitpanoOutTheSphere', onOutTheSphere);
			if (_this.buttons.indexOf('zoom') !== - 1){
				buttons.zoomPlus.addEventListener('click', onClickZoomPlus);
				buttons.zoomMinus.addEventListener('click', onClickZoomMinus);

			}
			if (_this.buttons.indexOf('autoRotate') !== - 1){
				buttons.autoRotate.addEventListener('click', onClickAutoRotate);
			}
			if (_this.buttons.indexOf('fullScreen') !== - 1){
				buttons.fullScreen.addEventListener('click', onClickFullScreen);
			}
			buttons.goBack.addEventListener('click', onClickGoBack);
			render();
		};

		function render() {
			requestAnimationFrame(render);
			TWEEN.update();
			if (!rotationActions.isActive && _this.autoRotate && intersectionActions.autoRotate && buttonsActions.autoRotate){
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
			if (zoomingActions.isZoomingPlus){
				camera.zoom = THREE.Math.clamp(camera.zoom + _this.zoomSpeed, _this.zoomMin, _this.zoomMax);
				camera.updateProjectionMatrix();
			}
			if (zoomingActions.isZoomingMinus){
				camera.zoom = THREE.Math.clamp(camera.zoom - _this.zoomSpeed, _this.zoomMin, _this.zoomMax);
				camera.updateProjectionMatrix();
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

		/**
		 * resize event
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
			if (intersectionActions.startX == intersectionActions.moveX || intersectionActions.startY == intersectionActions.moveY)
				handleIntersectionPointerEnd();
		}

		/**
		 * touch events
		 */

		function onTouchStart(e) {
			switch (e.touches.length){
				case 1:
					handleRotationPointerStart(e.touches[0]);
				break;
				case 2:
					handleZoomingTouchStart(e.touches);
				break;
			}
		}

		function onTouchMove(e) {
			switch (e.touches.length){
				case 1:
					handleRotationPointerMove(e.touches[0]);
				break;
				case 2:
					handleZoomingTouchMove(e.touches);
				break;
			}
		}

		function onTouchEnd() {
			handleRotationPointerEnd();
			handleZoomingTouchEnd();
		}

		/**
		 * custom events
		 */

		function onInTheSphere() {
			inTheSphere = true;
			buttons.goBack.style.display = 'block';
		}

		function onOutTheSphere() {
			inTheSphere = false;
			buttons.goBack.style.display = 'none';
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

		/**
		 * zooming events handlers
		 */

		function handleZoomingTouchStart(touches) {
			if (touches.length != 2)
				return;
			var dx = touches[0].clientX - touches[1].clientX;
			var dy = touches[0].clientY - touches[1].clientY;
			zoomingActions.fingersDistance = Math.sqrt(dx ** 2 + dy ** 2);
		}

		function handleZoomingTouchMove(touches) {
			if (touches.length != 2)
				return;
			var dx = touches[0].clientX - touches[1].clientX;
			var dy = touches[0].clientY - touches[1].clientY;
			var distance = Math.sqrt(dx ** 2 + dy ** 2);
			if (distance < zoomingActions.fingersDistance){
				zoomingActions.isZoomingPlus = false;
				zoomingActions.isZoomingMinus = true;
			} else {
				zoomingActions.isZoomingMinus = false;
				zoomingActions.isZoomingPlus = true;
			}
			zoomingActions.fingersDistance = distance;
		}

		function handleZoomingTouchEnd() {
			zoomingActions.isZoomingPlus = false;
			zoomingActions.isZoomingMinus = false;
		}

		function handleZoomingMouseWheel(e) {
			if (e.deltaY < 0){
				zoomingActions.isZoomingPlus = true;
				zoomingActions.isZoomingMinus = false;
			} else if (e.deltaY > 0){
				zoomingActions.isZoomingPlus = false;
				zoomingActions.isZoomingMinus = true;
			}
			setTimeout(function() {
				zoomingActions.isZoomingPlus = false;
				zoomingActions.isZoomingMinus = false;
			}, 200);
		}

		/**
		 * intersection events handlers
		 */

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

		/**
		 * buttons events
		 */

		function onClickZoomPlus(e) {
			e.preventDefault();
			zoomingActions.isZoomingPlus = true;
			setTimeout(function() {
				zoomingActions.isZoomingPlus = false;
			}, 400);
		}

		function onClickZoomMinus(e) {
			e.preventDefault();
			zoomingActions.isZoomingMinus = true;
			setTimeout(function() {
				zoomingActions.isZoomingMinus = false;
			}, 400);
		}

		function onClickAutoRotate(e) {
			e.preventDefault();
			if (!_this.autoRotate){
				_this.autoRotate = true;
				intersectionActions.autoRotate = _this.autoRotate;
			}
			if (buttonsActions.autoRotate)
				buttonsActions.autoRotate = false;
			else
				buttonsActions.autoRotate = true;
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

		/**
		 *
		 */

		Object.defineProperties(this, {
			changeCameraDistance:{
				value:function() {
					cameraDistance = _this.cameraDistance;
				},
				writeable:false
			},
			updateAutoRotate:{
				value:function() {
					intersectionActions.autoRotate = _this.autoRotate;
					buttonsActions.autoRotate = _this.autoRotate;
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
			EXTRAS:{
				get:function() {
					return EXTRAS;
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
		this.branchColor = options.branchColor || 'brown';
		this.leafColor = options.leafColor || 'green';
		this.enableLeaf = options.enableLeaf === undefined ? true : options.enableLeaf;

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
			var material = new THREE.MeshBasicMaterial({
				color:new THREE.Color(_this.branchColor)
			});
			var branch1 = new THREE.Mesh(geometry, material);
			branch1.position.x = -4;
			var branch2 = new THREE.Mesh(geometry, material);
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
			createGrapes();
			createBranch();
			createLeaf();
			_this.SPHERES.position.y = - 1;
			_this.EXTRAS.position.y = rowsOfGrapes - 2;
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
		this.branchColor = options.branchColor || 'brown';
		this.leafColor = options.leafColor || 'green';
		this.enableLeaf = options.enableLeaf === undefined ? true : options.enableLeaf;

		var nOfCherries = _this.images.length;
		var distance = 0.1;

		function createCherry() {
			if (nOfCherries > 3){
				console.error('');
				return false;
			}
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
				var material = new THREE.MeshBasicMaterial({
					color:new THREE.Color(_this.branchColor)
				});
				var branch = new THREE.Mesh(geometry, material);
				var radius = (nOfCherries == 1 ? 0 : 2 / (2 * Math.sin(Math.PI / nOfCherries)) + distance) - 4;
				var phi = 1.5 * Math.PI;
				var theta = (2 * Math.PI / nOfCherries) * i + (Math.PI / 2);
				branch.position.setFromSphericalCoords(radius, phi, theta);
				branch.rotation.y = ((Math.PI * 2) / nOfCherries * i) + Math.PI;
				_this.EXTRAS.add(branch);
			}
		}

		function createLeaf() {
			if (!_this.enableLeaf)
				return;
			var geometry = new CherryLeafGeometry(1, _this.segments);
			var material = new THREE.MeshBasicMaterial({
				color:new THREE.Color(_this.leafColor),
				side:THREE.DoubleSide
			});
			var leaf = new THREE.Mesh(geometry, material);
			leaf.position.x = 1;
			leaf.position.y = 2.5;
			leaf.position.z = 0.3;
			leaf.rotation.x = 2.6;
			leaf.rotation.y = 0;
			leaf.rotation.z = -1.2;
			_this.EXTRAS.add(leaf);
		}

		this.addToInit = function() {
			createCherry();
			createBranch();
			createLeaf();
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

	window.FRUITPANORAMA = {};
	window.FRUITPANORAMA.GRAPE = GRAPEPANORAMA;
	window.FRUITPANORAMA.CHERRY = CHERRYPANORAMA;
	window.FRUITPANORAMA.CUSTOM = CUSTOMPANORAMA;
	window.FRUITPANORAMA.Geometries = {};
	window.FRUITPANORAMA.Geometries.GrapeLeaf = GrapeLeafGeometry;
	window.FRUITPANORAMA.Geometries.CherryLeaf = CherryLeafGeometry;

})(THREE, TWEEN);
