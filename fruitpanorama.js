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
		this.segments = options.segments ? parseInt(options.segments) : 20;

		this.cameraDistance = options.cameraDistance ? parseInt(options.cameraDistance) : 10;
		this.enableRotation = options.enableRotation === undefined ? true : options.enableRotation;
		this.rotationSpeed = options.rotationSpeed ? parseInt(options.rotationSpeed * 100) / 100 : 5;
		this.autoRotate = options.autoRotate === undefined ? true : options.autoRotate;
		this.autoRotateSpeed = options.autoRotateSpeed ? parseInt(options.autoRotateSpeed * 100) / 100 : 1;
		this.startPolarAngle = options.startPolarAngle ? parseInt(options.startPolarAngle * 1000) / 1000 : 0;
		this.minPolarAngle = options.minPolarAngle ? parseInt(options.minPolarAngle * 1000) / 1000 : 0.001;
		this.maxPolarAngle = options.maxPolarAngle ? parseInt(options.maxPolarAngle * 1000) / 1000 : Math.PI - 0.001;
		this.zoomSpeed = options.zoomSpeed ? parseInt(options.zoomSpeed * 1000) / 1000 : 0.01;
		this.zoomMin = options.zoomMin ? parseInt(options.zoomMin * 100) / 100 : 0.4;
		this.zoomMax = options.zoomMax ? parseInt(options.zoomMax * 100) / 100 : 4;

		this.buttons = ['zoom', 'autoRotate', 'fullScreen'];
		this.enablePreloader = options.enablePreloader === undefined ? true : options.enablePreloader;

		/**
		 * private variables
		 */

		var renderer = new THREE.WebGLRenderer({alpha:true});
		var scene = new THREE.Scene();
		var camera = new THREE.PerspectiveCamera(75, _this.width / _this.height, 0.01, 1000);
		var loadingManager = new THREE.LoadingManager();
		var preloader = null;
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
			phi:_this.startPolarAngle,
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
		var zoomingActions = {
			isZoomingPlus:false,
			isZoomingMinus:false,
			fingerDistance:0
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
			_this.container.className = 'fruitpano-container';
			if (_this.enablePreloader){
				createPreloader();
				loadingManager.onProgress = preloaderOnProgress;
				loadingManager.onLoad = preloaderOnLoad;
			}
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
			renderer.domElement.addEventListener('mousewheel', handleZoomingMouseWheel);
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
			if (!intersectionActions.isMoving && _this.enableRotation){
				var phi = (Math.PI / 2) - rotationActions.phi;
				var phi = Math.max(_this.minPolarAngle, Math.min(_this.maxPolarAngle, phi));
				camera.position.setFromSphericalCoords(cameraDistance, phi, rotationActions.theta);
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
				INTERSECTED = intersect[0].object;
			} else {
				INTERSECTED = null;
			}
			_this.addToRender();
			renderer.render(scene, camera);
		}

		function preloaderOnProgress(url, loaded, total) {
			var nOfLoaded = (loaded / total) * 100;
			var progress = preloader.getElementsByClassName('fruitpano-progress');
			var percentage = preloader.getElementsByClassName('fruitpano-progress-percentage');
			progress[0].style.width = parseInt(nOfLoaded) + '%';
			percentage[0].innerHTML = parseInt(nOfLoaded) + '%';
		}

		function preloaderOnLoad() {
			preloader.className += ' fruitpano-preloader-fadeout';
			preloader.addEventListener('animationend', function() {
				_this.container.removeChild(preloader);
			});
		}

		/**
		 * create default things
		 */

		function createPreloader() {
			if (!_this.enablePreloader)
				return;
			preloader = document.createElement('div');
			preloader.className = 'fruitpano-preloader';
			var progressBar = document.createElement('div');
			progressBar.className = 'fruitpano-progressbar';
			var progress = document.createElement('div');
			progress.className = 'fruitpano-progress';
			var percentage = document.createElement('div');
			percentage.className = 'fruitpano-progress-percentage';
			percentage.innerHTML = '0%';
			progressBar.appendChild(progress);
			progressBar.appendChild(percentage);
			preloader.appendChild(progressBar);
			_this.container.appendChild(preloader);
		}

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
					map:new THREE.TextureLoader(loadingManager).load(_this.backgroundPanorama)
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
				btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" stroke-width="10" stroke="black" fill="transparent"></circle><line x1="50" y1="20" x2="50" y2="80" stroke-width="10" stroke="black"></line><line x1="20" y1="50" x2="80" y2="50" stroke-width="10" stroke="black"></line></svg>';
				buttons.zoomPlus = btn;
				btn.addEventListener('mousedown', onPointerStartZoomPlus);
				btn.addEventListener('mouseup', onPointerEndZoomPlus);
				btn.addEventListener('touchstart', onPointerStartZoomPlus);
				btn.addEventListener('touchend', onPointerEndZoomPlus);
				container.appendChild(btn);
				// minus
				var btn = document.createElement('a');
				btn.className = 'fruitpano-zoom-minus';
				btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" stroke-width="10" stroke="black" fill="transparent"></circle><line x1="20" y1="50" x2="80" y2="50" stroke-width="10" stroke="black"></line></svg>';
				buttons.zoomMinus = btn;
				btn.addEventListener('mousedown', onPointerStartZoomMinus);
				btn.addEventListener('mouseup', onPointerEndZoomMinus);
				btn.addEventListener('touchstart', onPointerStartZoomMinus);
				btn.addEventListener('touchend', onPointerEndZoomMinus);
				container.appendChild(btn);
			}
			// auto rotate
			if (_this.buttons.indexOf('autoRotate') !== - 1){
				var btn = document.createElement('a');
				btn.className = 'fruitpano-autorotate';
				btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 90 30 a 45 45 0 1 0 0 40 M 95 10 L 90 30 L 71 29" stroke-width="10" stroke="black" fill="transparent"></path></svg>';
				buttons.autoRotate = btn;
				btn.addEventListener('click', onClickAutoRotate);
				container.appendChild(btn);
			}
			// full screen
			if (_this.buttons.indexOf('fullScreen') !== - 1){
				var btn = document.createElement('a');
				btn.className = 'fruitpano-fullscreen';
				btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" rx="10" ry="10" width="90" height="90" stroke-width="10" stroke="black" fill="transparent"></rect></svg>';
				buttons.fullScreen = btn;
				btn.addEventListener('click', onClickFullScreen);
				container.appendChild(btn);
			}
			// go back
			var goBack = document.createElement('a');
			goBack.className = 'fruitpano-goback';
			goBack.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 10 50 L 35 25 L 35 40 L 70 40 L 70 60 L 35 60 L 35 75 Z" stroke-width="10" stroke="black" fill="black"></path><path d="M 65 20 L 95 20 L 95 80 L 65 80" stroke-width="10" stroke="black" fill="transparent"></path></svg>';
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
				material.map = new THREE.TextureLoader(loadingManager).load(_this.images[nthImg]);
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
			if (e.altKey || e.ctrlKey || e.shiftKey)
				return;
			handleRotationPointerStart(e);
			handleIntersectionPointerStart(e);
		}

		function onMouseMove(e) {
			if (e.altKey || e.ctrlKey || e.shiftKey)
				return;
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
				case 2:
					handleZoomingTouchStart(e.touches);
				break;
			}
		}

		function onTouchMove(e) {
			switch (e.touches.length){
				case 1:
					handleRotationPointerMove(e.touches[0]);
					handleIntersectionPointerMove(e.touches[0]);
				break;
				case 2:
					handleZoomingTouchMove(e.touches);
				break;
			}
		}

		function onTouchEnd() {
			handleRotationPointerEnd();
			handleIntersectionPointerEnd();
			handleZoomingTouchEnd();
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
		 * zooming event handlers
		 */

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

		function handleZoomingTouchStart(eTouches) {
			if (eTouches.length != 2)
				return;
			var dx = eTouches[0].clientX - eTouches[1].clientX;
			var dy = eTouches[0].clientY - eTouches[1].clientY;
			zoomingActions.fingerDistance = Math.sqrt(dx * dx + dy * dy);
		}

		function handleZoomingTouchMove(eTouches) {
			if (eTouches.length != 2)
				return;
			var dx = eTouches[0].clientX - eTouches[1].clientX;
			var dy = eTouches[0].clientY - eTouches[1].clientY;
			var distance = Math.sqrt(dx * dx + dy * dy);
			if (distance > zoomingActions.fingerDistance){
				zoomingActions.isZoomingPlus = true;
				zoomingActions.isZoomingMinus = false;
			} else {
				zoomingActions.isZoomingPlus = false;
				zoomingActions.isZoomingMinus = true;
			}
			zoomingActions.fingerDistance = distance;
		}

		function handleZoomingTouchEnd() {
			zoomingActions.isZoomingPlus = false;
			zoomingActions.isZoomingMinus = false;
		}

		/**
		 * buttons events
		 */

		function onPointerStartZoomPlus(e) {
			e.preventDefault();
			zoomingActions.isZoomingPlus = true;
			zoomingActions.isZoomingMinus = false;
		}
		
		function onPointerEndZoomPlus(e) {
			e.preventDefault();
			zoomingActions.isZoomingPlus = false;
			zoomingActions.isZoomingMinus = false;
		}
		
		function onPointerStartZoomMinus(e) {
			e.preventDefault();
			zoomingActions.isZoomingPlus = false;
			zoomingActions.isZoomingMinus = true;
		}
		
		function onPointerEndZoomMinus(e) {
			e.preventDefault();
			zoomingActions.isZoomingPlus = false;
			zoomingActions.isZoomingMinus = false;
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
			renderer:{
				get:function() {
					return renderer;
				}
			},
			scene:{
				get:function() {
					return scene;
				}
			},
			camera:{
				get:function() {
					return camera;
				}
			},
			loadingManager:{
				get:function() {
					return loadingManager;
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
						mesh.material.map = new THREE.TextureLoader(loadingManager).load(texture);
						mesh.material.needsUpdate = true;
					}
				}
			},
			setColor:{
				value:function(mesh, color) {
					if (!mesh)
						return;
					mesh.material.map = null;
					mesh.material.needsUpdate = true;
					mesh.material.color = new THREE.Color(color);
				}
			},
			setEventListeners:{
				value:function(add) {
					if (add){
						renderer.domElement.addEventListener('mousedown', onMouseDown);
						renderer.domElement.addEventListener('mousemove', onMouseMove);
						renderer.domElement.addEventListener('mouseup', onMouseUp);
						renderer.domElement.addEventListener('mouseleave', onMouseUp);
						renderer.domElement.addEventListener('touchstart', onTouchStart);
						renderer.domElement.addEventListener('touchmove', onTouchMove);
						renderer.domElement.addEventListener('touchend', onTouchEnd);
					} else {
						renderer.domElement.removeEventListener('mousedown', onMouseDown);
						renderer.domElement.removeEventListener('mousemove', onMouseMove);
						renderer.domElement.removeEventListener('mouseup', onMouseUp);
						renderer.domElement.removeEventListener('mouseleave', onMouseUp);
						renderer.domElement.removeEventListener('touchstart', onTouchStart);
						renderer.domElement.removeEventListener('touchmove', onTouchMove);
						renderer.domElement.removeEventListener('touchend', onTouchEnd);
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
		this.leafTexture = options.leafTexture || '';

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
				material.map = new THREE.TextureLoader(_this.loadingManager).load(_this.branchTexture);
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
			if (_this.leafTexture){
				material.color = new THREE.Color(1, 1, 1);
				material.map = new THREE.TextureLoader(_this.loadingManager).load(_this.leafTexture);
			}
			var leaf = new THREE.Mesh(geometry, material);
			leaf.name = 'leaf';
			leaf.position.set(-0.3, 2.1, 0.7);
			leaf.rotation.set(2.6, 0, -0.7);
			_this.EXTRAS.add(leaf);
		}

		this.addToInit = function() {
			if (_this.images.length == 0){
				console.warn('');
				return;
			}
			if (!isInt){
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

	GRAPEPANORAMA.prototype = Object.create(FRUITPANORAMA.prototype);
	GRAPEPANORAMA.prototype.constructor = GRAPEPANORAMA;

	/**
	 * THE CHERRYPANORAMA
	 */

	function CHERRYPANORAMA(options) {

		var _this = this;
		var options = options || {};
		FRUITPANORAMA.call(this, options);
		this.branchColor = options.branchColor || 'brown';
		this.branchTexture = options.branchTexture || '';
		this.enableLeaf = options.enableLeaf === undefined ? true : options.enableLeaf;
		this.leafColor = options.leafColor || 'green';
		this.leafTexture = options.leafTexture || '';

		var nOfCherries = _this.images.length;
		var distance = 0.1;

		function createCherry() {
			for (var i = 0; i < nOfCherries; i++){
				var cherry = _this.createFruit(i);
				var radius = nOfCherries == 1 ? 0 : 2 / (2 * Math.sin(Math.PI / nOfCherries)) + distance;
				var phi = 1.5 * Math.PI;
				var theta = (2 * Math.PI / nOfCherries) * i + (Math.PI / 2);
				cherry.position.setFromSphericalCoords(radius, phi, theta);
				_this.SPHERES.add(cherry);
			}
		}

		function createBranch() {
			var geometry = new THREE.TorusGeometry(4, 0.1, _this.segments, _this.segments, Math.PI / 6);
			var material = new THREE.MeshBasicMaterial({
				color:new THREE.Color(_this.branchColor)
			});
			if (_this.branchTexture){
				material.color = new THREE.Color(1, 1, 1);
				material.map = new THREE.TextureLoader(_this.loadingManager).load(_this.branchTexture);
			}
			for (var i = 0; i < nOfCherries; i++){
				var branch = new THREE.Mesh(geometry, material);
				branch.name = 'branch';
				var radius = (nOfCherries == 1 ? 0 : 2 / (2 * Math.sin(Math.PI / nOfCherries)) + distance) - 4;
				var phi = 1.5 * Math.PI;
				var theta = (2 * Math.PI / nOfCherries) * i + (Math.PI / 2);
				branch.position.setFromSphericalCoords(radius, phi, theta);
				branch.rotation.z = 0.25;
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
			if (_this.leafTexture){
				material.color = new THREE.Color(1, 1, 1);
				material.map = new THREE.TextureLoader(_this.loadingManager).load(_this.leafTexture);
			}
			var leaf = new THREE.Mesh(geometry, material);
			leaf.name = 'leaf';
			leaf.position.x = 1;
			leaf.position.y = 2.5;
			leaf.position.z = 0.3;
			leaf.rotation.x = 2.6;
			leaf.rotation.z = -1.2;
			if (_this.images.length === 1){
				leaf.position.x = 0.1;
				leaf.rotation.y = Math.PI;
			}
			_this.EXTRAS.add(leaf);
		}

		this.addToInit = function() {
			if (nOfCherries == 0){
				console.warn('');
				return;
			}
			if (nOfCherries > 3){
				console.error('');
				return;
			}
			createCherry();
			createBranch();
			createLeaf();
		}

	}

	CHERRYPANORAMA.prototype = Object.create(FRUITPANORAMA.prototype);
	CHERRYPANORAMA.prototype.constructor = CHERRYPANORAMA;

	/**
	 * THE FRUITBOWLPANORAMA
	 */

	function FRUITBOWLPANORAMA(options) {

		var _this = this;
		var options = options || {};
		FRUITPANORAMA.call(this, options);
		this.bowlColor = options.bowlColor || 'brown';
		this.bowlTexture = options.bowlTexture || '';

		var numOfFruits = _this.images.length;
		var from3To5 = numOfFruits > 2 && numOfFruits < 6;
		var divBy3 = numOfFruits % 3 === 0;
		var numOfFruitsInRow1, numOfFruitsInRow2;
		if (from3To5){
			numOfFruitsInRow1 = numOfFruits;
			numOfFruitsInRow2 = 0;
		}
		if (!from3To5 && divBy3){
			numOfFruitsInRow1 = numOfFruits * (2 / 3);
			numOfFruitsInRow2 = numOfFruits * (1 / 3);
		}

		function createFruits() {
			var nth = 0;
			for (var i = 0; i < numOfFruitsInRow1; i++){
				var fruit = _this.createFruit(nth);
				var radius = 2 / (2 * Math.sin(Math.PI / numOfFruitsInRow1));
				var phi = 1.5 * Math.PI;
				var theta = (2 * Math.PI / numOfFruitsInRow1) * i;
				fruit.position.setFromSphericalCoords(radius, phi, theta);
				_this.SPHERES.add(fruit);
				nth++;
			}
			if (!numOfFruitsInRow2)
				return;
			for (var i = 0; i < numOfFruitsInRow2; i++){
				var fruit = _this.createFruit(nth);
				var radius = 2 / (2 * Math.sin(Math.PI / numOfFruitsInRow2));
				var phi = 1.5 * Math.PI;
				var theta = ((2 * Math.PI / numOfFruitsInRow2) * i) + 0.5;
				fruit.position.setFromSphericalCoords(radius, phi, theta);
				fruit.position.y = 1.65;
				_this.SPHERES.add(fruit);
				nth++;
			}
		}

		function createBowl() {
			var radius = ((2 / (2 * Math.sin(Math.PI / numOfFruitsInRow1))) / 2) + 0.5;
			var geometry = new BowlGeometry(radius, _this.segments);
			var material = new THREE.MeshBasicMaterial({
				side:THREE.DoubleSide,
				color:new THREE.Color(_this.bowlColor)
			});
			if (_this.bowlTexture){
				material.color = new THREE.Color(1, 1, 1);
				material.map = new THREE.TextureLoader(_this.loadingManager).load(_this.bowlTexture);
			}
			var bowl = new THREE.Mesh(geometry, material);
			var posY = - ((numOfFruitsInRow1 - 2) * 0.2 + 1.2);
			bowl.position.y = posY;
			_this.EXTRAS.add(bowl);
		}

		this.addToInit = function() {
			if (numOfFruits == 0){
				console.warn('');
				return;
			}
			if (!from3To5 && !divBy3)
				return;
			createFruits();
			createBowl();
		}

	}

	FRUITBOWLPANORAMA.prototype = Object.create(FRUITPANORAMA.prototype);
	FRUITBOWLPANORAMA.prototype.constructor = FRUITBOWLPANORAMA;

	/**
	 * THE CUSTOMPANORAMA
	 */

	function CUSTOMPANORAMA(options) {

		var _this = this;
		var options = options || {};
		FRUITPANORAMA.call(this, options);
		this.fruitsPositions = options.fruitsPositions || [];
		this.fruitsScales = options.fruitsScales || [];
		this.extras = options.extras || [];

		function createFruits() {
			for (var i = 0; i < _this.images.length; i++){
				var fruit = _this.createFruit(i);
				if (_this.fruitsPositions[i]){
					var x = _this.fruitsPositions[i] && _this.fruitsPositions[i][0] ? _this.fruitsPositions[i][0] : 0;
					var y = _this.fruitsPositions[i] && _this.fruitsPositions[i][1] ? _this.fruitsPositions[i][1] : 0;
					var z = _this.fruitsPositions[i] && _this.fruitsPositions[i][2] ? _this.fruitsPositions[i][2] : 0;
					var scale = _this.fruitsScales[i] ? _this.fruitsScales[i] : 1;
					fruit.position.set(x, y, z);
					fruit.scale.set(scale, scale, scale);
				}
				_this.SPHERES.add(fruit);
			}
		}

		function createExtras() {
			var choices = geometryChoices();
			var extras = _this.extras;
			for (var i = 0; i < extras.length; i++){
				var geometryName = extras[i].geometry;
				if (geometryName == 'custom'){
					createMeshFromOBJFile(extras[i]);
				} else if (geometryName == 'text'){
					createTextObject(extras[i]);
				} else {
					var geometry = choices[geometryName];
					var geometry = new geometry(extras[i].geometryParameters ? extras[i].geometryParameters : {});
					var material = new THREE.MeshBasicMaterial({
						side:THREE.DoubleSide
					});
					if (extras[i].color){
						material.color = new THREE.Color(extras[i].color);
					}
					if (extras[i].texture){
						material.color = new THREE.Color(1, 1, 1);
						material.map = new THREE.TextureLoader(_this.loadingManager).load(extras[i].texture);
					}
					var mesh = new THREE.Mesh(geometry, material);
					mesh.name = extras[i].name;
					mesh.position.x = extras[i].position ? extras[i].position[0] : 0;
					mesh.position.y = extras[i].position ? extras[i].position[1] : 0;
					mesh.position.z = extras[i].position ? extras[i].position[2] : 0;
					mesh.rotation.x = extras[i].rotation ? extras[i].rotation[0] : 0;
					mesh.rotation.y = extras[i].rotation ? extras[i].rotation[1] : 0;
					mesh.rotation.z = extras[i].rotation ? extras[i].rotation[2] : 0;
					mesh.scale.x = extras[i].scale ? extras[i].scale[0] : 1;
					mesh.scale.y = extras[i].scale ? extras[i].scale[1] : 1;
					mesh.scale.z = extras[i].scale ? extras[i].scale[2] : 1;
					_this.EXTRAS.add(mesh);
				}
			}
		}

		function geometryChoices() {
			var choices = {
				grapeLeaf:function(atts) {
					var atts = atts || {};
					var radius = atts.radius ? atts.radius : null;
					return new GrapeLeafGeometry(radius, _this.segments);
				},
				cherryLeaf:function(atts) {
					var atts = atts || {};
					var radius = atts.radius ? atts.radius : null;
					return new CherryLeafGeometry(radius, _this.segments);
				},
				bowl:function(atts) {
					var atts = atts || {};
					var radius = atts.radius ? atts.radius : null;
					return new BowlGeometry(radius, _this.segments);
				},
				basket:function(atts) {
					var atts = atts || {};
					var radius = atts.radius ? atts.radius : null;
					var height = atts.height ? atts.height : null;
					return new BasketGeometry(radius, _this.segments, height);
				},
				box:function(atts) {
					var atts = atts || {};
					var width = atts.width ? atts.width : 1;
					var height = atts.height ? atts.height : 1;
					var depth = atts.depth ? atts.depth : 1;
					return new THREE.BoxGeometry(width, height, depth);
				},
				sphere:function(atts) {
					var atts = atts || {};
					var radius = atts.radius ? atts.radius : 1;
					var phiStart = atts.phiStart ? atts.phiStart : undefined;
					var phiLength = atts.phiLength ? atts.phiLength : undefined;
					var thetaStart = atts.thetaStart ? atts.thetaStart : undefined;
					var thetaLength = atts.thetaLength ? atts.thetaLength : undefined;
					return new THREE.SphereGeometry(radius, _this.segments, _this.segments, phiStart, phiLength, thetaStart, thetaLength);
				},
				torus:function(atts) {
					var atts = atts || {};
					var radius = atts.radius ? atts.radius : 1;
					var tube = atts.tube ? atts.tube : undefined;
					var arc = atts.arc ? atts.arc : undefined;
					return new THREE.TorusGeometry(radius, tube, _this.segments, _this.segments, arc);
				},
				plane:function(atts) {
					var atts = atts || {};
					var width = atts.width ? atts.width : 1;
					var height = atts.height ? atts.height : 1;
					return new THREE.PlaneGeometry(width, height);
				},
				circle:function(atts) {
					var atts = atts || {};
					var radius = atts.radius ? atts.radius : 1;
					var thetaStart = atts.thetaStart ? atts.thetaStart : undefined;
					var thetaLength = atts.thetaLength ? atts.thetaLength : undefined;
					return new THREE.CircleGeometry(radius, _this.segments, thetaStart, thetaLength);
				}
			};
			return choices;
		}

		function createTextObject(nthExtra) {
			if (!nthExtra || !nthExtra.font)
				return;
			new THREE.FontLoader(_this.loadingManager).load(nthExtra.font, function(font) {
				var text = nthExtra.text ? nthExtra.text : 'text';
				var parameters = nthExtra.geometryParameters ? nthExtra.geometryParameters : {};
				var size = parameters.size ? parameters.size : 1;
				var depth = parameters.depth ? parameters.depth : 1;
				var geometry = new THREE.TextGeometry(text, {
					font:font,
					size:size,
					height:depth,
					curveSegments:_this.segments
				});
				geometry.center();
				var material = new THREE.MeshBasicMaterial({
					side:THREE.DoubleSide
				});
				if (nthExtra.color){
					material.color = new THREE.Color(nthExtra.color);
				}
				if (nthExtra.texture){
					material.color = new THREE.Color(1, 1, 1);
					material.map = new THREE.TextureLoader(_this.loadingManager).load(nthExtra.texture);
				}
				var mesh = new THREE.Mesh(geometry, material);
				mesh.name = nthExtra.name;
				mesh.position.x = nthExtra.position ? nthExtra.position[0] : 0;
				mesh.position.y = nthExtra.position ? nthExtra.position[1] : 0;
				mesh.position.z = nthExtra.position ? nthExtra.position[2] : 0;
				mesh.rotation.x = nthExtra.rotation ? nthExtra.rotation[0] : 0;
				mesh.rotation.y = nthExtra.rotation ? nthExtra.rotation[1] : 0;
				mesh.rotation.z = nthExtra.rotation ? nthExtra.rotation[2] : 0;
				mesh.scale.x = nthExtra.scale ? nthExtra.scale[0] : 1;
				mesh.scale.y = nthExtra.scale ? nthExtra.scale[1] : 1;
				mesh.scale.z = nthExtra.scale ? nthExtra.scale[2] : 1;
				_this.EXTRAS.add(mesh);
				return mesh;
			});
		}

		function createMeshFromOBJFile(nthExtra) {
			if (!nthExtra || !nthExtra.file || !THREE.OBJLoader)
				return;
			new THREE.OBJLoader(_this.loadingManager).load(nthExtra.file, function(obj) {
				if (!obj.children[0] || !obj.children[0].geometry)
					return;
				var objGeometry = obj.children[0].geometry;
				var geometry = new THREE.Geometry();
				geometry.fromBufferGeometry(objGeometry);
				var material = new THREE.MeshBasicMaterial({
					side:THREE.DoubleSide
				});
				if (nthExtra.color){
					material.color = new THREE.Color(nthExtra.color);
				}
				if (nthExtra.texture){
					material.color = new THREE.Color(1, 1, 1);
					material.map = new THREE.TextureLoader(_this.loadingManager).load(nthExtra.texture);
				}
				var mesh = new THREE.Mesh(geometry, material);
				mesh.name = nthExtra.name;
				mesh.position.x = nthExtra.position ? nthExtra.position[0] : 0;
				mesh.position.y = nthExtra.position ? nthExtra.position[1] : 0;
				mesh.position.z = nthExtra.position ? nthExtra.position[2] : 0;
				mesh.rotation.x = nthExtra.rotation ? nthExtra.rotation[0] : 0;
				mesh.rotation.y = nthExtra.rotation ? nthExtra.rotation[1] : 0;
				mesh.rotation.z = nthExtra.rotation ? nthExtra.rotation[2] : 0;
				mesh.scale.x = nthExtra.scale ? nthExtra.scale[0] : 1;
				mesh.scale.y = nthExtra.scale ? nthExtra.scale[1] : 1;
				mesh.scale.z = nthExtra.scale ? nthExtra.scale[2] : 1;
				_this.EXTRAS.add(mesh);
				return mesh;
			});
		}

		this.addToInit = function() {
			createFruits();
			createExtras();
		}

		Object.defineProperty(this, 'getGeometryChoices', {
			get:function() {
				return geometryChoices();
			}
		});

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
		var geometry = FixLeafGeometryUvs(geometry);
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
		var geometry = FixLeafGeometryUvs(geometry);
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

	function BasketGeometry(radius, segments, height) {
		var radius = radius || 1;
		var segments = segments || 10;
		var height = height || 1;
		var points = [
			new THREE.Vector2(0, 0),
			new THREE.Vector2(1 * radius, 0),
			new THREE.Vector2(1.2 * radius, height * radius)
		];
		var g1 = new THREE.LatheGeometry(points, segments);
		var g2 = new THREE.TorusGeometry(1.2 * radius, 0.02 * radius, segments, segments, Math.PI);
		var g1v = g1.vertices;
		var g2v = g2.vertices;
		var g1f = g1.faces;
		var g2f = g2.faces;
		var g1u = g1.faceVertexUvs[0];
		var g2u = g2.faceVertexUvs[0];
		var basket = new THREE.Geometry();
		// create vertices
		for (var i = 0; i < g1v.length; i++){
			basket.vertices.push(g1v[i]);
		}
		for (var i = 0; i < g2v.length; i++){
			var v = g2v[i];
			v.y += height * radius;
			basket.vertices.push(v);
		}
		// create faces
		for (var i = 0; i < g1f.length; i++){
			basket.faces.push(g1f[i]);
		}
		for (var i = 0; i < g2f.length; i++){
			var length = g1v.length;
			var face = g2f[i];
			face.a += length;
			face.b += length;
			face.c += length;
			basket.faces.push(face);
		}
		// create uvs
		basket.faceVertexUvs[0] = [];
		for (var i = 0; i < g1u.length; i++){
			basket.faceVertexUvs[0].push(g1u[i]);
		}
		for (var i = 0; i < g2u.length; i++){
			basket.faceVertexUvs[0].push(g2u[i]);
		}
		return basket;
	}

	/**
	 * others
	 */

	function FixLeafGeometryUvs(geometry){
		geometry.computeBoundingBox();
		var min = geometry.boundingBox.min;
		var max = geometry.boundingBox.max;
		var offset = new THREE.Vector2(0 - min.x, 0 - min.y);
		var range = new THREE.Vector2(max.x - min.x, max.y - min.y);
		var vertices = geometry.vertices;
		var faces = geometry.faces;
		var uvs = [];
		for (var i = 0; i < faces.length; i++){
			var v1 = vertices[faces[i].a];
			var v2 = vertices[faces[i].b];
			var v3 = vertices[faces[i].c];
			uvs.push([
				new THREE.Vector2((v1.x + offset.x) / range.x, (v1.y + offset.y) / range.y),
				new THREE.Vector2((v2.x + offset.x) / range.x, (v2.y + offset.y) / range.y),
				new THREE.Vector2((v3.x + offset.x) / range.x, (v3.y + offset.y) / range.y)
			]);
		}
		geometry.faceVertexUvs[0] = uvs;
		geometry.uvsNeedUpdate = true;
		return geometry;
	}

	window.FRUITPANORAMA = {};
	window.FRUITPANORAMA.GRAPE = GRAPEPANORAMA;
	window.FRUITPANORAMA.CHERRY = CHERRYPANORAMA;
	window.FRUITPANORAMA.FRUITBOWL = FRUITBOWLPANORAMA;
	window.FRUITPANORAMA.CUSTOM = CUSTOMPANORAMA;

})(THREE, TWEEN);
