# TAPtoTALK 변경 기록

이 문서는 TAPtoTALK의 주요 설계 변경만 기록한다. 원본 TAPtoTEN 저장소는 수정하지 않았으며,
모든 TAPtoTALK 변경은 `origin/main`에 커밋했다.

과거 화면은 해당 커밋을 임시 폴더에서 다시 실행해 390×844 크기로 캡처했다.
자판은 실행할 때마다 무작위로 섞이므로 블록 위치는 당시 실행과 다를 수 있지만,
레이아웃·색상·기능은 기록된 커밋의 코드 그대로다.

## 화면 변화

| 시점 | 커밋 | 핵심 상태 | 화면 |
| --- | --- | --- | --- |
| 초기 프로토타입 | `ccdbd1a` | TAPtoTEN 기반 9×9 한글 자모판과 문장 따라쓰기·자유 쓰기 시작 | [스크린샷](screenshots/history/01-initial-ccdbd1a.jpg) |
| 회색 스킨 | `eac788f` | 노란 기운을 줄이고 자음·모음 대비를 회색 계열로 정리 | [스크린샷](screenshots/history/02-gray-eac788f.jpg) |
| 오방색 스킨 | `e475942` | 청·적을 주색, 황을 포인트로 사용하고 영어 UI 적용 | [스크린샷](screenshots/history/03-obangsaek-e475942.jpg) |
| 갤럭시 묶음 자판 | `990c581` | `ㄱㅋㄲ`, `ㅈㅊㅉ`처럼 한 블록을 반복해서 누르는 방식과 5단계 점수 구간 적용 | [스크린샷](screenshots/history/04-galaxy-keyboard-990c581.jpg) |
| 독립 자모 자판 | `77d4ecf` | 기본·쌍·격음 자음을 각각 한 블록으로 분리하고 하단은 띄어쓰기·삭제만 유지 | [스크린샷](screenshots/history/05-independent-jamo-77d4ecf.jpg) |

## 주요 기능 변화

| 날짜 | 커밋 | 변경 내용 |
| --- | --- | --- |
| 2026-08-31 | `ccdbd1a` | TAPtoTALK 프로젝트를 시작하고 한글 조합 규칙을 `core/hangul`로 분리했다. |
| 2026-08-31 | `8027b45` | 천지인 조합과 주제 글쓰기 조건을 정리했다. |
| 2026-08-31 | `289f416` | 제출 흐름과 교육용 문장 완성 조건을 추가했다. |
| 2026-08-31 | `c4cc96a` | How to play, 사운드, 진동, 규칙 화면을 추가했다. |
| 2026-08-31 | `f4f7eac` | 두 번째 게임을 자유 쓰기에서 60초 단어 맞추기로 변경했다. |
| 2026-08-31 | `e475942` | 오방색 디자인과 영어 인터페이스를 적용했다. |
| 2026-09-01 | `fdba68b` | Sentence Copy를 단계별 5문장 연속 게임과 누적 점수 구조로 변경했다. |
| 2026-09-01 | `c464a8e` | 모든 레벨을 열고 일시정지와 5문장 완료 후 결과 화면을 추가했다. |
| 2026-09-01 | `990c581` | 점수를 1,500점 만점과 TAPtoTEN의 다섯 결과 등급으로 맞췄다. |
| 2026-09-01 | `4bd630f` | Lv.5 기준 150초·180초·200초·240초 등급 시간을 적용했다. |
| 2026-09-01 | `77d4ecf` | 갤럭시 반복 입력을 없애고 모든 자음과 천지인 요소를 독립 블록으로 바꿨다. |
| 2026-09-01 | `0c13d1b` | 목표 자소 수의 약 1.5배를 보장하고 자판 색상을 확장했다. |
| 2026-09-01 | `78ef3d9` | 받침 없는 낱말부터 실용 복합문장까지 Sentence Copy를 Lv.1~Lv.8로 확장했다. |
| 2026-09-01 | `541aac8` | TAPtoTEN의 종이색 컬러스킨을 적용하고 천지인·문장부호 모양을 분리했다. |
| 2026-09-01 | `0ec2935` | TAPtoTEN 방식의 색상 블록·흰 글씨를 적용하고 선택 화면 로고를 120%로 키웠다. |
| 2026-09-01 | `59149e8` | 선택 화면 로고를 330px로 확대하고 게임 선택 박스와 UI 서체를 TAPtoTEN 기준으로 맞췄다. |
| 2026-09-01 | `274ce8d` | 같은 자음·모음·문장부호가 항상 같은 블록 색을 사용하도록 고정 색상표를 적용했다. |
| 2026-09-01 | `d8ad011` | TAPtoTEN의 첫 9색과 블록 크기·반사광·음영 효과를 그대로 적용하고, 독립 기호용 색상을 27색으로 확장했다. |
| 2026-09-01 | `c7718e9` | 작은 블록에서도 서로 같은 색처럼 보이지 않도록 추가 18색의 색상 계열과 명도 간격을 넓혔다. |
| 2026-09-01 | `5de6a1e` | 게임 선택 화면 로고 아래에 넓은 자간의 고딕체 `KOREAN` 버전 표기를 추가했다. |
| 2026-09-01 | `97cc35c` | `KOREAN` 버전 표기를 140%로 확대하고 로고 아래 간격을 조금 늘렸다. |
| 2026-09-01 | `374d316` | 자모별 고정색을 없애고 참고 이미지의 분홍·빨강·주황·노랑·연두·초록·하늘·파랑·보라 9색을 81칸에 균등하게 섞었다. |
| 2026-09-01 | `8d7fd91` | 천지인 `ㆍ ㅡ ㅣ`를 하단 고정 버튼으로 옮기고, 자판 문장부호를 크게 표시되는 `! ?` 두 종류로 정리했다. |
| 2026-09-01 | `d76e62b` | 4초 시작 화면의 커버를 새 `taptotalk-cover2.png`로 교체하고 미디어 경로를 앱 설정에서 연결했다. |
| 2026-09-01 | `dff9fd0` | 대문을 `taptotalk-cover3.png`로 교체하고, 자판 자소를 명조체로 바꾸며 파란 천지인과 흰색 편집 버튼을 두 그룹으로 분리했다. |
| 2026-09-01 | `dc7c69e` | 천지인과 Space/Delete 높이를 44px로 통일하고 천지인의 별도 입체 효과를 제거했다. |
| 2026-09-01 | `80faea4` | 하단 다섯 버튼의 간격을 모두 5px로 통일하고 천지인에서 그라데이션·반사광을 제거했다. |
| 2026-09-01 | `d8db679` | 자소를 블록 정중앙에 배치하고 사용 완료 블록에서 중첩되던 반사광·글자 그림자를 제거했다. |
| 2026-09-01 | `5706971` | 난타 입력이 목표 글자 수와 입력선 너비를 넘지 못하게 제한해 자판 전체가 회색으로 소모되는 문제를 막았다. |
| 2026-09-01 | `2082903` | 자판을 `accb4f7` 구조로 복원해 천지인을 81칸에 되돌리고, 120% 고딕 자소·70% 마침표·쉼표 제외 및 `cover4`를 적용했다. |
| 2026-09-01 | `03f939b` | 블록 자소 굵기와 그림자를 한 단계 낮춰 `ㅃ`의 획을 선명하게 하고 새 `cover5`를 적용했다. |
| 2026-09-01 | `14e7160` | 문장부호를 `. ! ?`로 제한하고 모음 천은 8px 정사각형, 마침표는 4px 원형으로 구분했다. |
| 2026-09-01 | `46577ef` | 완성 전 음절의 표시 글자 수가 목표 길이를 잠시 넘더라도 실제 목표 키 수까지 입력되도록 긴 문장 제한 오류를 수정했다. |
| 2026-09-01 | `27139f1` | 문장부호가 필요 없는 단어 자판에 좌우·상하 반전 자음을 추가하고 How to play을 6단계 직접 체험형 튜토리얼로 갱신했다. |
| 2026-09-01 | `12ca3af` | 반전 자음을 원래 자음이 입력되는 블록이 아닌 `×` 오입력 함정으로 수정하고, Delete 복구와 How to play 실패 체험을 추가했다. ([게임 화면](screenshots/2026-09-01-mirrored-trap-wrong-input.jpg), [튜토리얼](screenshots/2026-09-01-how-to-play-trap-practice.jpg)) |
| 2026-09-02 | `83db840` | 여분 자음이 반전 함정이 되는 확률을 50%에서 20%로 낮춰 정상 블록의 비중을 높였다. ([스크린샷](screenshots/2026-09-02-reduced-mirror-traps.jpg)) |
| 2026-09-02 | `a58304e` | 게임 선택을 Korean Alphabet → Word Challenge → Sentence Copy 순서의 3개 모드로 확장하고, 자음·모음·음절 행·복잡한 외마디 소리를 순서대로 찾는 90초 자소 학습을 추가했다. 스크린샷은 빈 여백 없는 430×932 PNG 방식으로 개선했다. ([메뉴](screenshots/2026-09-02-three-game-menu.png), [게임](screenshots/2026-09-02-korean-alphabet-game.png)) |
| 2026-09-02 | `759c0ef` | 세 게임 제목을 같은 하늘색으로 통일하고, 자소 모드에서 영어 설명을 제거했다. Word Challenge는 한글 옆에 작은 영어 단어를, Sentence Copy는 한글 아래 한 줄 영어 번역을 표시한다. ([메뉴](screenshots/2026-09-02-blue-three-game-menu.png), [자소](screenshots/2026-09-02-alphabet-sequence-only.png), [단어](screenshots/2026-09-02-word-translation.png), [문장](screenshots/2026-09-02-sentence-translation.png)) |
| 2026-09-02 | `8cb2db5` | 4초 시작 화면의 이미지를 새 `taptotalk-cover6.png`로 교체하고 HTML 초기 경로와 앱 미디어 설정을 함께 갱신했다. ([스크린샷](screenshots/2026-09-02-cover6-splash.png)) |
| 2026-09-02 | `d127427` | Korean Alphabet의 음절·의성어 라운드에서 완성 글자는 목표로만 보여주고, 자판은 `가=ㄱ+ㅏ`, `쾅=ㅋ+ㅘ+ㅇ`처럼 분해된 자소 블록으로 구성하도록 변경했다. ([스크린샷](screenshots/2026-09-02-syllable-jamo-blocks.png)) |
| 2026-09-02 | `70357c3` | Korean Alphabet의 전체 90초 타이머를 없애고 자음 40초·모음 40초·음절 120초·의성어 90초의 라운드별 초기화 타이머로 변경했다. ([스크린샷](screenshots/2026-09-02-round-timers.png)) |
| 2026-09-02 | `7e1e1e9` | Korean Alphabet을 Consonants Lv.1~4, Vowels Lv.5~8, Syllables Lv.9~12의 세 코스로 재구성했다. 사용자는 과목만 선택하고 네 레벨은 5문제씩 순서대로 자동 진행하며, Lv.1부터 반전 함정이 등장하고 모음 자판은 `ㆍ ㅡ ㅣ`만 사용한다. ([과목 선택](screenshots/2026-09-02-alphabet-course-picker.png), [자동 진행](screenshots/2026-09-02-alphabet-auto-levels.png), [모음](screenshots/2026-09-02-vowel-cheonjiin-course.png)) |
| 2026-09-02 | `8badd80` | Vowels 자판의 모음천 블록에서 가로획 문자와 정사각형 표시가 겹치던 문제를 제거하고 8×8 정사각형 하나만 표시하도록 수정했다. ([스크린샷](screenshots/2026-09-02-clean-cheonjiin-dot.png)) |
| 2026-09-02 | `43cd61a` | Consonants Lv.1의 분할·반복 문제를 없애 전체 자음 순서를 한 번만 60초 동안 입력하게 했다. 완료 즉시 Lv.2의 가획 묶음 `ㄱㅋ → ㄴㄷㄹ → ㅁㅂㅍ → ㅅㅈㅊ → ㅇㅎ`와 75초 타이머가 시작된다. ([Lv.1](screenshots/2026-09-02-lv1-full-order.png), [Lv.2](screenshots/2026-09-02-lv2-added-strokes.png)) |
| 2026-09-02 | `47707b1` | Consonants 기억 단계를 고정 문자열에서 매 실행마다 달라지는 무작위 자음으로 변경했다. Lv.3은 3·4·5·6자, Lv.4는 7·8·9자이며 한 목표 안에서는 자음이 중복되지 않는다. ([Lv.3](screenshots/2026-09-02-random-consonant-lv3.png), [Lv.4](screenshots/2026-09-02-random-consonant-lv4.png)) |
| 2026-09-02 | `d150139` | Vowels 자판에 모음천과 헷갈리는 작은 마침표 함정을 섞고 각 레벨의 마지막 종합 반복을 제거했다. Syllables도 마지막 반복을 제거하고 완성 모음 대신 `ㆍ·ㅡ·ㅣ`를 조합해 입력하도록 변경했다. ([모음](screenshots/2026-09-02-vowel-period-traps.png), [음절](screenshots/2026-09-02-syllable-cheonjiin-strokes.png)) |
| 2026-09-02 | `07ac6e1` | 자소별 완료·현재·오입력 색상, 현재 문제 Retry, 완료 목표 박스 반전을 추가했다. Word Challenge는 받침 없음·받침 있음·감탄사·의성의태어·복모음의 5단계에서 3단어씩 학습하도록 바꾸고, Sentence Copy의 기존 단어 2단계를 이동했다. Syllables는 받침 한 글자부터 `개·왜·꾀`의 복모음까지 `ㆍ·ㅡ·ㅣ`로 조합한다. ([진행 표시](screenshots/2026-09-02-alphabet-visible-progress-retry.png), [완료 반전](screenshots/2026-09-02-alphabet-target-negative-complete.png), [단어 단계](screenshots/2026-09-02-word-learning-levels.png), [받침](screenshots/2026-09-02-syllable-final-sounds.png), [복모음](screenshots/2026-09-02-syllable-compound-vowels.png)) |
| 2026-09-02 | `586c420` | Korean Alphabet에서 한 번에 제시하는 목표를 최대 5자소로 제한했다. Lv.1은 전체 자음 순서를 5·5·4개로 나누고, Lv.3은 3·4·5개, Lv.4는 5개씩 출제하며 모음의 6자 목표도 5자로 줄였다. ([스크린샷](screenshots/2026-09-02-alphabet-five-jamo-maximum.png)) |
| 2026-09-02 | `ded575e` | Word Challenge와 Sentence Copy에도 입력한 글자, 자소별 완료·현재·오류 상태, 전체 자소 대비 입력 수를 표시하고 완료 시 목표 박스를 반전하도록 했다. 알파벳 코스의 중복 `required order` 행을 제거하고 메인 게임 설명을 짧은 한 줄로 정리했다. ([단어](screenshots/2026-09-02-word-jamo-progress-error.png), [문장](screenshots/2026-09-02-sentence-jamo-progress-error.png), [코스 선택](screenshots/2026-09-02-simple-alphabet-course-picker.png)) |
| 2026-09-02 | `5f17754` | Word Challenge와 Sentence Copy의 별도 자소 블록 줄을 제거하고 목표 단어·문장의 해당 글자가 입력 진행에 따라 현재·완료·오류 색상으로 직접 바뀌게 했다. 목표 글자 크기는 28px로 고정하고 입력 수 표시는 유지했다. ([진행](screenshots/2026-09-02-word-target-character-progress.png), [오류](screenshots/2026-09-02-word-target-character-error.png), [문장](screenshots/2026-09-02-sentence-target-character-progress.png)) |
| 2026-09-02 | `af81b01` | 합성 글자 전체가 아니라 입력한 초성·모음·받침 영역만 색이 변하도록 세로모음형·가로모음형·복모음형 레이어를 분리했다. 입력 안내와 실제 입력은 동일한 92px 공간을 사용해 입력 전후 자판 위치가 움직이지 않는다. ([입력 전](screenshots/2026-09-02-fixed-input-space-before.png), [초성 색상](screenshots/2026-09-02-initial-component-color.png)) |
| 2026-09-02 | `a5cd9ad` | 글꼴 위치에 의존하던 자소 영역 추정 표시를 되돌리고 목표 음절 전체의 현재·완료·오류 표시로 복원했다. 입력 영역은 64px로 줄이고 9×9 자판은 축소되지 않는 정사각형으로 고정했다. ([전체 화면](screenshots/2026-09-02-square-board-whole-syllable-progress.png), [입력 후](screenshots/2026-09-02-whole-syllable-progress-after-tap.png)) |
| 2026-09-02 | `8026c89` | Korean Alphabet의 자음은 표준 명칭, 모음은 표준 소리로 안내하고 음절에는 짧은 영문 뜻을 표시했다. 애매한 `외`는 `귀 / ear`로 교체했다. 모든 게임의 한글 제시어를 28px로 통일하고 단어 번역을 독립된 한 줄로 분리했으며, 입력 글자를 밑줄 가까이 내렸다. ([자소](screenshots/2026-09-02-alphabet-standard-pronunciation.png), [단어](screenshots/2026-09-02-word-stacked-translation-input-line.png), [입력](screenshots/2026-09-02-lowered-typed-text.png)) |
| 2026-09-02 | `0fbb8ec` | Syllables를 Lv.9–13의 생활 중심 5단계로 확장했다. `나·너`에서 시작해 신체, 일상, 자연을 거쳐 `힘·꾀·꿈·개·소·말·닭·술·춤`으로 마무리하며 각 음절에 짧은 영문 뜻을 제공한다. ([스크린샷](screenshots/2026-09-02-syllables-lv9-na-neo.png)) |
| 2026-09-02 | `f12d632` | 기존 TAPtoTALK 커버 앞에 3초 TapeeTepee 스튜디오 시작 화면을 추가했다. 원본 배경색 `#1d2087`로 전체 화면을 채우고 이미지를 `contain`으로 배치해 기기 비율이 달라도 빈 띠가 생기지 않으며, 1290px 폭으로 최적화해 모바일 디코딩 지연을 줄였다. 이후 기존 커버가 4초 표시된다. ([스튜디오](screenshots/2026-09-02-tapeetepee-studio-splash.png), [기존 커버](screenshots/2026-09-02-studio-to-product-cover.png)) |
| 2026-09-02 | `0cbe62e` | TapeeTepee 시작 화면을 전체 이미지 방식에서 분리형 심볼 방식으로 변경했다. 배경은 정확히 `#1d2087`로 칠하고 새 PNG의 투명 여백을 제거한 심볼을 화면 가로폭의 42%로, 가로·세로 중앙에 배치했다. ([스크린샷](screenshots/2026-09-02-centered-studio-mark-42-percent.png)) |
| 2026-09-02 | `7601be2` | 새 PNG의 흰 글자가 투명 배경 미리보기에서 보이지 않았던 점을 바로잡아, 심볼뿐 아니라 `TapeeTepee · tap dance studio` 글자까지 포함한 원본 로고 전체를 가로 42% 중앙 배치로 복원했다. ([스크린샷](screenshots/2026-09-02-centered-studio-full-logo-42-percent.png)) |
| 2026-09-02 | `6621b40` | `#1d2087` 테마색을 첫 3초 TapeeTepee 화면에만 제한했다. 기존 커버가 나타나는 순간 브라우저 테마색을 흰색으로 복원해 커버와 메인 화면은 원래 종이색 디자인을 유지한다. ([커버](screenshots/2026-09-02-product-cover-restored-theme.png), [메인](screenshots/2026-09-02-main-menu-restored-theme.png)) |
| 2026-09-02 | `e052cfb` | iPhone Safari가 최초 테마색을 상·하단 브라우저 UI에 계속 유지하는 동작을 반영해 HTML 테마색을 처음부터 흰색으로 고정했다. 파란색은 첫 스튜디오 화면의 콘텐츠 배경에만 적용된다. ([메인](screenshots/2026-09-02-static-white-browser-theme-main.png)) |
| 2026-09-02 | `c509b5c` | 외국인 학습자를 위해 Korean Alphabet의 자소 안내를 글자 이름에서 IPA 음가로 변경했다. 자음은 위치 변이를 `[k~ɡ]`처럼, 모음은 `[a]`처럼 표시하고 `ㅇ`은 `∅ / [ŋ]`로 안내한다. 음절의 영문 뜻은 유지하고 Rules에 IPA 범위 표기 설명을 추가했다. ([자음](screenshots/2026-09-02-alphabet-ipa-sound-guide.png), [모음](screenshots/2026-09-02-vowel-ipa-sound-guide.png)) |
| 2026-09-02 | `3a5a07f` | 첫 스튜디오 화면 다음에 4초간 표시되는 TAPtoTALK 커버를 새 `taptotalk-cover7.png`로 교체했다. 4837px 원본을 모바일용 1290px 폭으로 최적화하고 초기 HTML과 앱 설정 경로를 함께 변경했다. ([스크린샷](screenshots/2026-09-02-cover7-splash.png)) |
| 2026-09-03 | `9a5d6b4` | GitHub에 업로드된 새 `TAPtoTALK-logo2.svg`를 메인 로고로 연결했다. Consonants의 Long Memory Lv.4를 제거해 Lv.1–3만 순서대로 진행하며, 선택 화면 설명을 `order, added strokes`로 간소화했다. ([메인](screenshots/2026-09-03-main-logo2.png), [코스 선택](screenshots/2026-09-03-consonants-lv1-3.png)) |
| 2026-09-03 | `e13b3fc` | Korean Alphabet은 오입력이 진행에 반영되지 않는 구조이므로 불필요한 `Retry this item` 버튼과 전용 초기화 상태·처리 코드를 제거했다. ([스크린샷](screenshots/2026-09-03-alphabet-no-retry.png)) |
| 2026-09-03 | `6751e42` | 게임 완료 시 `4`, 태피, 티피, 후피, 해피, 재피의 WebM·MP4·MP3 여섯 묶음 중 하나를 무작위로 선택하도록 확장했다. 점수별 영상 크기·위치는 유지하고, macOS·Linux 배포 호환성을 위해 한글 미디어 파일명을 안전한 영문 이름으로 정리했다. ([스크린샷](screenshots/2026-09-03-random-celebration-video.png)) |
| 2026-09-03 | `74d7373` | Korean Alphabet의 모음 게임에서 제시어 아래 입력 순서에 표시되던 문자형 모음천 `ㆍ`를 자판과 동일한 8×8px 네모 기호로 통일했다. ([스크린샷](screenshots/2026-09-03-vowel-square-cheonjiin-progress.png)) |
| 2026-09-03 | `57b2219` | Syllables의 쌍자음을 완성 블록 대신 기본 자음 반복으로 분해하고, 겹받침도 낱자 단위로 분해했다. `꾀`는 `ㄱ+ㄱ+ㆍ+ㅡ+ㅣ`, `읽`은 `ㅇ+ㅣ+ㄹ+ㄱ` 순서로 입력한다. ([스크린샷](screenshots/2026-09-03-lv13-double-consonant-parts.png)) |
| 2026-09-04 | `76dfcb0` | Korean Alphabet의 자음·음절 반전 함정 비율을 약 10%p 높였다. 모음에는 여분 칸의 약 10% 비율로 `╱`, `^`, `!`, `@` 오입력 함정을 균등하게 섞고, 정상 `ㆍ·ㅡ·ㅣ` 필수 블록은 그대로 보장한다. ([스크린샷](screenshots/2026-09-04-vowel-symbol-traps.png)) |
| 2026-09-04 | `0d195aa` | 자음의 위치별 IPA 음가를 `[k] / [ɡ]`, `[ɾ] / [l]`처럼 슬래시로 분리해 연속 발음 오해를 줄였다. 총 7개 캐릭터 영상 중 티피는 실패·시간 초과 전용으로 분리하고, 성공 시 기존 `1`, `4`, 태피, 후피, 해피, 재피 6개 중 하나를 무작위로 재생한다. ([스크린샷](screenshots/2026-09-04-ipa-slash-variants.png)) |
| 2026-09-04 | `37d1376` | 커버 전 3초간 표시되는 TapeeTepee 시작 화면을 새 `tapeetepee-open-talk.png` 심볼로 교체했다. 바깥 투명 여백을 제거하고 내부 흰 도형은 보존해 `#1d2087` 배경 중앙에 화면 가로의 42%로 표시한다. ([스크린샷](screenshots/2026-09-04-new-opening-symbol.png)) |
| 2026-09-04 | `62a923f` | 시작 화면 PNG를 흰색 `TapeeTepee · openstudio` 글자가 포함된 `tapeetepee-open-02.png` 원본 전체로 다시 교체했다. 글자까지 포함한 전체 이미지를 자르지 않고 파란 배경 중앙에 표시한다. ([스크린샷](screenshots/2026-09-04-opening-logo-with-white-text.png)) |

## 현재 기준

- Sentence Copy: Lv.1~Lv.6, 레벨당 5개 문장, 전체 시간으로 1,500점 산정
- Word Challenge: 5개 학습 단계 중 하나를 선택해 제한 시간 안에 3단어 완성
- 자판: 9×9, 독립 자음·천지인·쉼표를 제외한 문장부호, 목표 자소의 약 1.5배 보장
- 고정 버튼: 띄어쓰기와 길게 눌러 연속 삭제할 수 있는 Delete
- 미디어: 로고·표지·점수 영상은 교체 가능한 파일과 설정으로 분리
- 디자인: TAPtoTEN 종이 스킨과 블록 크기·효과, 자모와 무관하게 섞이는 9색 블록, 흰색 글자
