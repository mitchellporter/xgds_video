    function initializePackery() {
      //update  sizing
        var $container = $('#container');
        $container.packery({
        itemSelector: '.item',
        gutter: 10
        });
        
        makeResizable($container);
    }
    
    function makeResizable($container) {
        // get item elements, jQuery-ify them
        var $itemElems = $( $container.packery('getItemElements') );
        // make item elements draggable
        $itemElems.draggable().resizable({
            aspectRatio: true
        });
        // bind Draggable events to Packery
        $container.packery( 'bindUIDraggableEvents', $itemElems );
        
        // handle resizing
        var resizeTimeout;
        $itemElems.on( 'resize', function( event, ui ) {
          // debounce
          if ( resizeTimeout ) {
            clearTimeout( resizeTimeout );
          }
        
          resizeTimeout = setTimeout( function() {
            $container.packery( 'fit', ui.element[0] );
          }, 100 );
    });
    }
    /*
  // get item elements, jQuery-ify them
  var $itemElems = $( $container.packery('getItemElements') );
  // make item elements draggable
  $itemElems.draggable().resizable();
  // bind Draggable events to Packery
  $container.packery( 'bindUIDraggableEvents', $itemElems );
  
  // handle resizing
  var resizeTimeout;
  $itemElems.on( 'resize', function( event, ui ) {
    // debounce
    if ( resizeTimeout ) {
      clearTimeout( resizeTimeout );
    }
  
    resizeTimeout = setTimeout( function() {
      $container.packery( 'fit', ui.element[0] );
    }, 100 );
  });*/
