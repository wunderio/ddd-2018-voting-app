load('api_config.js');
load('api_events.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_net.js');
load('api_sys.js');
load('api_timer.js');
load('api_http.js');
load('api_esp32.js');
load('api_pwm.js');

let onboard_led = Cfg.get('pins.led');
let button = Cfg.get('pins.button');

// Prototype
// let led1 = 15;
// let led2 = 22;
// let button1 = 4;
// let button2 = 21;

// Final LED buttons
let led1 = 33;
let led2 = 32;
let button1 = 12;
let button2 = 14;

let pwm_freq = 100;


let endpoint = '';
//let endpoint = 'http://example.com/';
let api_key = '';

let getInfo = function() {
  return JSON.stringify({
    total_ram: Sys.total_ram(),
    free_ram: Sys.free_ram(),
    temperature: ESP32.temp()
  });
};

// Blink built-in LED every second
GPIO.set_mode(onboard_led, GPIO.MODE_OUTPUT);
GPIO.set_mode(led1, GPIO.MODE_OUTPUT);
GPIO.set_mode(led2, GPIO.MODE_OUTPUT);




Timer.set(1000, 0, function() {
  start_viz();
}, null);



Timer.set(10000, Timer.REPEAT, function() {
  print('uptime:', Sys.uptime(), getInfo(), t);
}, null);


GPIO.set_button_handler(button, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 20, function() {
  print('Onboard button');
}, null);


GPIO.set_button_handler(button1, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 20, function() {
  print('button 1');
  led_value = 0.9;
  led_increment = -0.002;
  start_blinking(led1);
  
  cast_vote('peach');
}, null);

GPIO.set_button_handler(button2, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 20, function() {
  print('button 2');
  led_value = 0.1;
  led_increment = 0.002;
  start_blinking(led2);
  
  cast_vote('banana');
}, null);


// Monitor network connectivity.
Event.addGroupHandler(Net.EVENT_GRP, function(ev, evdata, arg) {
  let evs = '???';
  if (ev === Net.STATUS_DISCONNECTED) {
    evs = 'DISCONNECTED';
    GPIO.write(onboard_led, 0);
  } else if (ev === Net.STATUS_CONNECTING) {
    evs = 'CONNECTING';
  } else if (ev === Net.STATUS_CONNECTED) {
    evs = 'CONNECTED';
    GPIO.write(onboard_led, 1);
  } else if (ev === Net.STATUS_GOT_IP) {
    evs = 'GOT_IP';
  }
  print('== Net event:', ev, evs);
}, null);

let option = '';
let tries = 0;
function cast_vote(vote) {
  option = vote;
  print(endpoint + option);
  HTTP.query({
    url: endpoint + option,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: 'api_key=' + api_key,
    success: function(body, full_http_msg) {
      print('success:', body); 
      start_viz();
    },
    error: function(err) { 
      print('error:', err);
      if (tries > 3) {
        start_viz();
        tries = 0;
      }
      else {
        cast_vote(option);
      }
    }
  });
}

let led_value = 0.1;
let led_increment = 0.002;
let t = 0;

function start_viz() {
  stop_blinking();
  stop_viz();
  t = Timer.set(5, Timer.REPEAT, function() {
    
    if (led_value >= 1 || led_value <= 0) {
      led_increment = - led_increment;
    }
    
    led_value += led_increment;
    
    PWM.set(led1, pwm_freq, Math.pow(led_value, 2));
    PWM.set(led2, pwm_freq, Math.pow(1 - led_value, 2));
    
  }, null);
  print('Start visualization', t);
}

function stop_viz() {
  print('Stop visualization', t);
  if (t !== 0) {
    Timer.del(t);
  }
}

let blink_t = 0;
let blink_state = 0;
let blink_pin = 0;
function start_blinking(pin) {
  stop_blinking();
  stop_viz();
  print('Start blinking');
  blink_pin = pin;
  
  blink_t = Timer.set(5, Timer.REPEAT, function(pin) {
    
    PWM.set(led1, pwm_freq, 0);
    PWM.set(led2, pwm_freq, 0);
    
    PWM.set(blink_pin, pwm_freq, blink_state);
    blink_state = 1 - blink_state;
    
  }, null);
}

function stop_blinking() {
  if (blink_t !== 0) {
    print('Stop blinking');
    Timer.del(blink_t);
  }
}
