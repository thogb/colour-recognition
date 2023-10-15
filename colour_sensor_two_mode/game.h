#ifndef CR_GAME
#define CR_GAME

#include <Time.h>         // Include the Time library
#include <TimeLib.h>      // Include the TimeLib library
#include <stdio.h>

#include "gameSetting.h"

#define TIME_STAMP_SIZE 64

typedef struct game
{
    GameSetting gameSetting;
    int answers[MAX_QUESTION_SIZE];
    int actualColor;
    int expectedColor;
    int questionCount;
    int score;
    unsigned long qStartTime;
    char start[TIME_STAMP_SIZE];
    char end[TIME_STAMP_SIZE];
} Game;

void game_init(Game* game, GameSetting* gameSetting) {
    struct tm timeinfo;
    game->actualColor = 0;
    game->expectedColor = 0;
    game->questionCount = 0;
    game->score = 0;
    game->qStartTime = 0;
    game->gameSetting = *gameSetting;
    sprintf(game->start, "null");
    sprintf(game->start, "null");

    // Set the timezone for Perth (Australia/Perth)
    configTime(8 * 3600, 0, "pool.ntp.org");

    if (getLocalTime(&timeinfo)) {
      strftime(game->start, TIME_STAMP_SIZE, "%Y-%m-%d %H:%M:%S", &timeinfo);
      Serial.print("Game Start Time (Perth): ");
      Serial.println(game->start);
    }
}

void game_next_question(Game* game) {
    game->expectedColor = game->gameSetting.questions[game->questionCount];
    game->actualColor = 0;
    game->questionCount++;
    game->qStartTime = millis();
}

int game_is_finished(Game* game) {
    return game->questionCount > game->gameSetting.questionSize;
}

int game_is_answer_correct(Game* game) {
    return game->actualColor == game->expectedColor;
}

int game_question_time_is_up(Game* game) {
    return millis() - game->qStartTime > game->gameSetting.questionTime;
}

int game_has_valid_input_color(Game* game) {
    return game->actualColor >= 1 && game->actualColor <= 3;
}

void game_input_color(Game* game, int color) {
    game->actualColor = color;
}

void game_attempt_question(Game* game) {
    game->answers[game->questionCount-1] = game->actualColor;

    if (game_is_answer_correct(game)) {
        game->score++;
    }
}

void game_end(Game* game) {
    struct tm timeinfo;

    // Set the timezone for Perth (Australia/Perth)
    configTime(8 * 3600, 0, "pool.ntp.org");

    if (getLocalTime(&timeinfo)) {
      strftime(game->end, TIME_STAMP_SIZE, "%Y-%m-%d %H:%M:%S", &timeinfo);
    }
}

#endif