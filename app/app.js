// Load angular
var app = angular.module('scotch-chat', ['ngMaterial', 'ngAnimate', 'ngMdIcons', 'btford.socket-io'])

// Set our server URL
var serverBaseUrl = 'http://127.0.0.1:2015'

// Service to interact with the NodeWebKit GUI and window
app.factory('GUI', function () {
  // return nw.GUI
  return require('nw.gui')
})
app.factory('Window', function () {
  return GUI.window.get()
})

// Service to interact with socket library
app.factory('socket', function (socketFactory) {
  var myIoSocket = io.connect(serverBaseUrl)
  var socket = socketFactory({
    ioSocket: myIoSocket
  })
  return socket
})

// ng-enter directive
app.directive('ngEnter', function () {
  return function (scope, element, attrs) {
    element.bind('keydown keypress', function (event) {
      if (event.which === 13) {
        scope.$apply(function () {
          scope.$eval(attrs.ngEnter)
        })
        event.preventDefault()
      }
    })
  }
})

// Our controller
app.controller('MainCtrl', function ($scope, Window, GUI, $mdDialog, socket, $http) {
  // Menu setup
  // Global scope
  $scope.messages = []
  $scope.room = ''
  // Build a window menu for our app using the GUI and Window service
  var windowMenu = new GUI.Menu({
    type: 'menubar'
  })
  var roomsMenu = new GUI.Menu()

  windowMenu.append(new GUI.MenuItem({
    label: 'Rooms',
    submenu: roomsMenu
  }))

  windowMenu.append(new GUI.MenuItem({
    label: 'Exit',
    click: function () {
      Window.close()
    }
  }))

  // Listen for the setup event and create rooms
  socket.on('setup', function (data) {
    var rooms = data.rooms
    for (var i = 0; i < rooms.length; i++) {
      // Loop and append room the the window menu
      handleRoomSubMenu(i)
    }
    function handleRoomSubMenu (r) {
      var clickedRoom = rooms[r]
      // append each room to the menu
      roomsMenu.append(new GUI.MenuItem({
        label: clickedRoom.toUpperCase(),
        click: function () {
          // On Click switch rooms
          $scope.room = clickedRoom.toUpperCase()
          // Notify the server of changed room
          socket.emit('switch room', {
            newRoom: clickedRoom,
            username: $scope.username
          })
          // Fetch the new rooms messages
          $http.get(serverBaseUrl + '/msg?room=' + clickedRoom).success(function (msgs) {
            $scope.messages = msgs
          })
        }
      }))
    }
    // Attach Menu
    GUI.Window.get().menu = windowMenu
  })

  // Modal setup(Obejctive #2)
  $scope.usernameModal = function (ev) {
    // Launch a modal to get username
    $mdDialog.show({
      controller: UsernameDialogController,
      templateUrl: 'partials/username.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: ev
    })
    .then(function (answer) {
      // Set the username with the value returned by the modal
      $scope.username = answer
      // Tell the server about the new user
      socket.emit('new user', {
        username: answer
      })
      // Set room to General
      $scope.room = 'GENERAL'
      // Fetch chat messages in general
      $http.get(serverBaseUrl + '/msg?room=' + $scope.room).success(function (msgs) {
        $scope.messages = msgs
      })
    }, function () {
      Window.close()
    })
  }

  // listen for new message(Objective #3)
  socket.on('message created', function (data) {
    // Push new messages to $scope.messages
    $scope.messages.push(data)
    // Empty the textarea
    $scope.message = ''
  })

  // Notify server of new message(Objective #4)
  $scope.send = function (msg) {
    // notify server that there is a new message
    socket.emit('new message', {
      room: $scope.room,
      message: msg,
      username: $scope.username
    })
  }
})

// Dialog controller
function UsernameDialogController ($scope, $mdDialog) {
  $scope.answer = function (answer) {
    $mdDialog.hide(answer)
  }
}
