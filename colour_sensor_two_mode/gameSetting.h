#ifndef CR_GAME_SETTING
#define CR_GAME_SETTING

#include <ArduinoJson.h>

#define MAX_QUESTION_SIZE 20

typedef struct gameSetting
{
    int mode;
    int questionSize;
    int questionTime;
    int questions[MAX_QUESTION_SIZE];
} GameSetting;

void init_default_game_setting(GameSetting* gameSetting) {
    gameSetting->mode = 1;
    gameSetting->questionTime = 3000;
    gameSetting->questionSize = 3;
    gameSetting->questions[0] = 1;
    gameSetting->questions[1] = 3;
    gameSetting->questions[2] = 2;
}

void update_game_setting_from_cloud(GameSetting* gameSetting, JsonObject& jsonObject) {
    JsonVariant mode = jsonObject["mode"];
    if (!mode.isNull()) {
        gameSetting->mode = mode.as<int>();
    }
    JsonArray jsonArray = jsonObject["questions"];
    if (!jsonArray.isNull()) {
        gameSetting->questionSize = jsonArray.size();
        int i = 0;
        for (JsonVariant v : jsonArray) {
            gameSetting->questions[i++] = v.as<int>();
        }
    }
}

#endif