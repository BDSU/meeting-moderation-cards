$(document).ready(() => {
    var yellow = false;
    var blue = false;
    var green = false;
    var red = false;
    var white = false;
    var all = false;

    $('#yellowBtn').on('click', function(event) {
        event.preventDefault();
        socket.send(JSON.stringify({
            type: yellow ? 'lower' : 'raise',
            card: 'yellow',
        }));
        yellow = !yellow;
        $(this).toggleClass('btn-color-unselected');
        $(this).toggleClass('btn-color-selected');
    });
    $('#blueBtn').on('click', function(event) {
        event.preventDefault();
        socket.send(JSON.stringify({
            type: blue ? 'lower' : 'raise',
            card: 'blue',
        }));
        blue = !blue;
        $(this).toggleClass('btn-color-unselected');
        $(this).toggleClass('btn-color-selected');
    });
    $('#greenBtn').on('click', function(event) {
        event.preventDefault();
        socket.send(JSON.stringify({
            type: green ? 'lower' : 'raise',
            card: 'green',
        }));
        green = !green;
        $(this).toggleClass('btn-color-unselected');
        $(this).toggleClass('btn-color-selected');
    });
    $('#redBtn').on('click', function(event) {
        event.preventDefault();
        socket.send(JSON.stringify({
            type: red ? 'lower' : 'raise',
            card: 'red',
        }));
        red = !red;
        $(this).toggleClass('btn-color-unselected');
        $(this).toggleClass('btn-color-selected');
    });
    $('#whiteBtn').on('click', function(event) {
        event.preventDefault();
        socket.send(JSON.stringify({
            type: white ? 'lower' : 'raise',
            card: 'white',
        }));
        white = !white;
        $(this).toggleClass('btn-color-unselected');
        $(this).toggleClass('btn-color-selected');
    });
    $('#allBtn').on('click', function(event) {
        event.preventDefault();
        socket.send(JSON.stringify({
            type: all ? 'lower' : 'raise',
            card: 'all',
        }));
        all = !all;
        $(this).toggleClass('btn-color-unselected');
        $(this).toggleClass('btn-color-selected');
    });
});