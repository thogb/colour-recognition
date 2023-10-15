#include <WiFiClientSecure.h>
#include <MQTTClient.h> // MQTT by Joel Geahwiler
#include <ArduinoJson.h> // ArduinoJson by Benoit Blanchon
#include "WiFi.h"

#include <LiquidCrystal.h>
#include <Time.h>         // Include the Time library
#include <TimeLib.h>      // Include the TimeLib library
#include <pgmspace.h>

#include <Wire.h>

#include <Arduino.h>

#include "gameSetting.h"
#include "game.h"

#include "secrets.h"

// Color sensor settings
#define Addr 0x38 // I2C address of the BH1745NUC
#define RED_THRESHOLD 125
#define GREEN_THRESHOLD 125
#define BLUE_THRESHOLD 125

// Speaker
#define SPEAKER_PIN 25  // Use GPIO25 as the DAC pin

// AWS topics
#define AWS_IOT_SUBSCRIBE_TOPIC "$aws/things/cr-device-1/shadow/update/delta/noMetaData"
#define AWS_IOT_SUBSCRIBE_TOPIC_ACCEPT "$aws/things/cr-device-1/shadow/update/accept"
#define AWS_IOT_SUBSCRIBE_TOPIC_INIT "$aws/things/cr-device-1/shadow/get/accepted/noMetaData"
#define AWS_IOT_PUBLISH_TOPIC_INIT "$aws/things/cr-device-1/shadow/get"
#define AWS_IOT_PUBLISH_TOPIC_UPDATE "$aws/things/cr-device-1/shadow/update"
#define AWS_IOT_PUBLISH_TOPIC "colourRecognition/cr-device-1/gameData"

WiFiClientSecure net = WiFiClientSecure();
MQTTClient client = MQTTClient(2048);

char timestamp[64] = "";

// LCD Initialization
LiquidCrystal lcd(12, 13, 14, 4, 15, 2);

// Game
GameSetting gameSetting;
Game game;
int expectedColor;
int actualColor;

// Represent if the device has retrieved latest device shadow state
int isSyncedWithAWS = 0;
int hasPublishedInit = 0;

// Button settings
const int BUTTON_GAME_MODE = 34;
const unsigned long DEBOUNCE_DELAY = 50; 
bool lastButtonState = HIGH;
unsigned long lastDebounceTime = 0; 
int endTraining = 0;

void setup() {
  Serial.begin(9600);
  
  // Intialise game setting in case the retrieve from AWS fails
  init_default_game_setting(&gameSetting);

  connectAWS();

  lcd.begin(16, 2);
  pinMode(BUTTON_GAME_MODE, INPUT_PULLUP);

  // config time
  configTime(8*3600, 8*3600, "pool.ntp.org", "time.nist.gov"); // UTC+8

  // set up color sensor
  initColorSensor();
  Serial.println("finished setup");
}

void loop() {
    printGameInstruction();

    if (!hasPublishedInit) {
      delay(100);
      // Send get request to server to get the device shadow state
      bool publishSuccess = client.publish(AWS_IOT_PUBLISH_TOPIC_INIT, "");
      Serial.println("Sent request to aws for device shadow state.");
      hasPublishedInit = 1;
    } else {
      if (buttonPressed()) {
        if (gameSetting.mode == 1) {
          startNewGame();
        } else {
          startTraining();
        }
      }
    }

    client.loop();
    // Serial.println("Client looped");
    delay(50);
}

void startNewGame() {
    game_init(&game, &gameSetting);
    game_next_question(&game);
    printGameStartMessage();
    while (!game_is_finished(&game)) {
        printQuestionMessage();
        game_input_color(&game, readColorSensor());

        if (game_question_time_is_up(&game) || game_has_valid_input_color(&game)) {
            game_attempt_question(&game);

            printQuestionMessage();
            clientCheckAndDelay(300);

            if (game_is_answer_correct(&game)) {
                printCorrectMessage();
                play_correct_answer_sound();
            } else {
                printWrongMessage();
                play_wrong_answer_sound();
            }

            game_next_question(&game);
            clientCheckAndDelay(200);
        }

        clientCheckAndDelay(100);
    }

    game_end(&game);
    printGameFinishedMessage();
    publishGameData();
}

void startTraining() {
    endTraining = 0;
    printTrainingStartMessage();
    while (!endTraining) {
        expectedColor = random(1, 4);
        printTrainingQuestionMessage();
        clientCheckCallBackAndDelay(5000, checkTrainingEnd);
        actualColor = readColorSensor();
        printTrainingQuestionMessage();
        clientCheckCallBackAndDelay(1000, checkTrainingEnd);
        if (actualColor == expectedColor) {
            printCorrectMessage();
            play_correct_answer_sound();
            actualColor = 0;
        } else {
            printWrongMessage();
            play_wrong_answer_sound();
            actualColor = 0;
        }
        clientCheckCallBackAndDelay(500, checkTrainingEnd);
    }
}

void checkTrainingEnd() {
  endTraining = endTraining || buttonPressed();
}

void clientCheckCallBackAndDelay(int len, void (*callback)(void)) {
  int start = millis();
  while (millis() - start < len) {
    callback();
    client.loop();
    delay(50);
  }
}

void clientCheckAndDelay(int len) {
  int start = millis();
  while (millis() - start < len) {
    client.loop();
    delay(50);
  }
}

String parseGameMode(int mode) {
    if (mode == 0) {
        return "training";
    } else if (mode == 1) {
        return "game";
    }

    return "Error";
}

void printGameFinishedMessage() {
  char buff[20];

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Game finished");

  sprintf(buff, "Score: %d/%d", game.score, game.gameSetting.questionSize);
  lcd.setCursor(0, 1);
  lcd.print(buff);
}

void printGameInstruction() {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Start Game");

    lcd.setCursor(0, 1);
    lcd.print("Mode: ");
    lcd.print(parseGameMode(gameSetting.mode));
}

void printQuestionMessage() {
    char buff[20];

    sprintf(buff, "Qn %d/%d: %s", game.questionCount, \ 
    game.gameSetting.questionSize, mapColorToString(game.expectedColor));
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(buff);

    lcd.setCursor(0, 1);
    lcd.print("Answer: ");
    lcd.print(mapColorToString(game.actualColor));
}

void printTrainingQuestionMessage() {
    char buff[20];
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Qn: ");
    lcd.print(mapColorToString(expectedColor));

    lcd.setCursor(0, 1);
    lcd.print("Answer: ");
    lcd.print(mapColorToString(actualColor));
}

void printCorrectMessage() {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Correct!");
}

void printWrongMessage() {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Wrong!");
}

void printGameStartMessage() {
    for (int i = 0; i < 3; i++) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Game starting in:");
        
        lcd.setCursor(0, 1);
        lcd.print(3 - i);
        clientCheckAndDelay(1000);
    }
}

void printTrainingStartMessage() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Training Mode:");
  clientCheckAndDelay(1000);
}

/// --- Helpers --- ///

bool buttonPressed() {
  bool currentButtonState = digitalRead(BUTTON_GAME_MODE);
  
  if (currentButtonState != lastButtonState) {
    lastDebounceTime = millis();
  }

  lastButtonState = currentButtonState;
  return (millis() - lastDebounceTime) > DEBOUNCE_DELAY && currentButtonState == LOW;
}

String mapColorToString(int color) {
  switch(color) {
    case 1: return "RED";
    case 2: return "GREEN";
    case 3: return "BLUE";
    case 0: return "Waiting";
    default: return "Invalid";
  }
}

/// --- Color Sensor --- ///

int mapToRGB(int value) {
    // Map the 10-bit value (0-1023) to 8-bit value (0-255)
    return map(value, 0, 1023, 0, 255);
}

void initColorSensor(){
    // Initialise I2C communication as MASTER
    Wire.begin();
    // Initialise serial communication, set baud rate = 9600
    Serial.begin(9600);

    // Start I2C Transmission
    Wire.beginTransmission(Addr);
    // Select mode control register1
    Wire.write(0x41);
    // Set RGBC measurement time 160 msec
    Wire.write(0x00);
    // Stop I2C Transmission
    Wire.endTransmission();
    
    // Start I2C Transmission
    Wire.beginTransmission(Addr);
    // Select mode control register2
    Wire.write(0x42);
    // Set measurement mode is active, gain = 1x
    Wire.write(0x90);
    // Stop I2C Transmission
    Wire.endTransmission();
    
    // Start I2C Transmission
    Wire.beginTransmission(Addr);
    // Select mode control register3
    Wire.write(0x44);
    // Set default value
    Wire.write(0x02);
    // Stop I2C Transmission
    Wire.endTransmission();
    delay(300);
}

int readColorSensor(){
    unsigned int data[8];
    for(int i = 0; i < 8; i++)
    {
        // Start I2C Transmission
        Wire.beginTransmission(Addr);
        // Select data register
        Wire.write((80+i));
        // Stop I2C Transmission
        Wire.endTransmission();
        
        // Request 1 byte of data from the device
        Wire.requestFrom(Addr, 1);
        
        // Read 8 bytes of data
        // Red lsb, Red msb, Green lsb, Green msb, Blue lsb, Blue msb
        // cData lsb, cData msb
        if(Wire.available() == 1)
        {
            data[i] = Wire.read();
        }
        delay(300);
    }

    // Convert the data
    int red = ((data[1] & 0xFF) * 256) + (data[0] & 0xFF);
    int green = ((data[3] & 0xFF) * 256) + (data[2] & 0xFF);
    int blue = ((data[5] & 0xFF) * 256) + (data[4] & 0xFF);
    int cData = ((data[7] & 0xFF) * 256) + (data[6] & 0xFF);

    // Map the values to 0-255 range
    int mappedRed = mapToRGB(red);
    int mappedGreen = mapToRGB(green);
    int mappedBlue = mapToRGB(blue);
    
    // Output data to serial monitor
    // Serial.print("Red Color luminance  : ");
    // Serial.println(mappedRed);
    // Serial.print("Green Color luminance : ");
    // Serial.println(mappedGreen);
    // Serial.print("Blue Color luminance : ");
    // Serial.println(mappedBlue);
    // Serial.print("Clear Data Color luminance : ");
    // Serial.println(cData);

    // Detect red color
    if (mappedRed > RED_THRESHOLD && mappedRed > mappedGreen && mappedRed > mappedBlue) {
        Serial.println("Detected Red Object!");
        return 1;
    }
    // Detect green color
    else if (mappedGreen > GREEN_THRESHOLD && mappedGreen > mappedRed && mappedGreen > mappedBlue) {
        Serial.println("Detected Green Object!");
        return 2;
    }
    // Detect blue color
    else if (mappedBlue > BLUE_THRESHOLD && mappedBlue > mappedRed && mappedBlue > mappedGreen) {
        Serial.println("Detected Blue Object!");
        return 3;
    }
    // No specific color detected
    else {
        Serial.println("No Specific Color Detected.");
        return 0;
    }
}

/// --- Connection --- ///

void connectAWS(){
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED){
    delay(500);
    Serial.printf("wifi: %s, password: %s\n", WIFI_SSID, WIFI_PASSWORD);
    Serial.println("...");
  }
  // Configure WiFiClientSecure to use the AWS IoT device credentials
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);

  // Connect to the MQTT broker on the AWS endpoint we defined earlier
  client.begin(AWS_IOT_ENDPOINT, 8883, net);

  // Create a message handler
  client.onMessage(messageHandler);

  Serial.print("Connecting to AWS IOT");
  while (!client.connect(THINGNAME)) {
    Serial.println(".");
    delay(100);
  }

  if(!client.connected()){
    Serial.println("AWS IoT Timeout!");
    return;
  }

  // Subscribe to a topic
  // bool subMode = client.subscribe("colourRecognition/cr-device-1/mode");
  // bool sub2 = client.subscribe("colourRecognition/cr-device-1/gameInstruction");
  bool subUpdate = client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC, 1);
  // bool subUpdate = client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC_ACCEPT, 1);
  Serial.println("Subscribed to update/delta for updates.");
  Serial.println(AWS_IOT_SUBSCRIBE_TOPIC);
  Serial.println(subUpdate);
  // client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC_INIT);
  client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC_INIT, 1);
  // client.subscribe("$aws/things/cr-device-1/shadow/get/rejected");
  Serial.println("Subscribed to shadow get/accepted for init.");

  Serial.println("AWS IoT Connected!");
}

bool publishGameSetting() {
    StaticJsonDocument<1024> doc;
    JsonObject root = doc.to<JsonObject>();
    JsonObject state = root.createNestedObject("state");
    JsonObject reported = state.createNestedObject("reported");

    reported["mode"] = gameSetting.mode;
    JsonArray docQuestions = reported.createNestedArray("questions");
    for (int i = 0; i < gameSetting.questionSize; i++) {
        docQuestions.add(gameSetting.questions[i]);
    }

    char jsonBuffer[1024];
    serializeJson(doc, jsonBuffer);

    bool publishSuccess = client.publish(AWS_IOT_PUBLISH_TOPIC_UPDATE, jsonBuffer);
    Serial.println("Published game setting.");
    return publishSuccess;
}

void messageHandler(String &topic, String &payload) {
    Serial.println("incoming: " + topic + " - " + payload);

    int updatedGameSetting = 0;
    StaticJsonDocument<2048> doc;
    deserializeJson(doc, payload);
    JsonObject root = doc.as<JsonObject>();
    JsonObject state = root["state"];

    if (state.isNull()) return;

    if (!isSyncedWithAWS && topic.equals(AWS_IOT_SUBSCRIBE_TOPIC_INIT)) {
        // Received device shadow from cloud after a publish to get
        JsonObject desired = state["desired"];
        if (desired.isNull()) return;
        update_game_setting_from_cloud(&gameSetting, desired);
        Serial.println("Finished device intialisation.");
        isSyncedWithAWS = 1;
        client.unsubscribe(AWS_IOT_SUBSCRIBE_TOPIC_INIT);
        Serial.println("Unsubscribed to the intialisation topic.");
        updatedGameSetting = 1;
    } else if (topic.equals(AWS_IOT_SUBSCRIBE_TOPIC)) {
        // Received reqeust from the cloud to update the game setting
        update_game_setting_from_cloud(&gameSetting, state);
        Serial.println("Updated device state from app request.");
        updatedGameSetting = 1;
    }

    if (updatedGameSetting) {
        publishGameSetting();
    }
}

bool publishGameData() {
    StaticJsonDocument<2048> doc;

    doc["start"] = game.start;
    doc["end"] = game.end;
    doc["score"] = game.score;
    doc["size"] = game.gameSetting.questionSize;

    JsonArray docQuestions = doc.createNestedArray("questions");
    for (int i = 0; i < game.gameSetting.questionSize; i++) {
        docQuestions.add(game.gameSetting.questions[i]);
    }

    JsonArray docAnswers = doc.createNestedArray("answers");
    for (int i = 0; i < game.gameSetting.questionSize; i++) {
        docAnswers.add(game.answers[i]);
    }

    char jsonBuffer[2048];
    serializeJson(doc, jsonBuffer);
    
    bool publishSuccess = client.publish(AWS_IOT_PUBLISH_TOPIC, jsonBuffer);

    

    return publishSuccess;
}

/// --- Speaker --- ///

void play_correct_answer_sound() {
  int melody[] = {
    523,  // C5
    587,  // D5
    659,  // E5
    698,  // F5
    783   // G5
  };

  int noteDurations[] = {
    8, 8, 8, 8, 2  // Fast notes followed by a longer one
  };

  for (int i = 0; i < 5; i++) {
    int noteDuration = 1000 / noteDurations[i];
    tone(SPEAKER_PIN, melody[i], noteDuration);
    int pauseBetweenNotes = noteDuration * 1.30;  // Slight pause between notes for clarity
    delay(pauseBetweenNotes);
    noTone(SPEAKER_PIN);  // Stop tone
  }
}

void play_wrong_answer_sound() {
  int melody[] = {
    349,  // F4
    330,  // E4
    294,  // D4
    262   // C4
  };

  int noteDurations[] = {
    8, 8, 8, 4  // Quick descending notes ending in a slightly longer low tone
  };

  for (int i = 0; i < 4; i++) {
    int noteDuration = 1000 / noteDurations[i];
    tone(SPEAKER_PIN, melody[i], noteDuration);
    int pauseBetweenNotes = noteDuration * 1.30;  // Slight pause between notes for clarity
    delay(pauseBetweenNotes);
    noTone(SPEAKER_PIN);  // Stop tone
  }
}
