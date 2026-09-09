# 디자인과 콘텐츠 수정 경계

TAP to PICK은 TAPtoTALK의 화면 감각과 폰트를 유지하면서 이미지 게임 규칙을 독립적으로 관리합니다.

## 자주 수정할 곳

- 게임 시작 화면: `src/content/pickModes.ts`의 짧은 설명·안내, `src/ui/pickIntroIcons.ts`의 벡터 아이콘, `talkApp.ts`의 `showModeIntro`/`startMode`, `talk.css`의 `.pick-intro-*`로 구성한다. 모드 선택과 Play again은 안내 화면만 열고 START가 실제 플레이를 시작한다. 안내 중 메뉴 음악을 유지하고 타이머·메모리 미리보기·몽타주 순서는 진행하지 않는다. 뒤로가기·Escape는 선택했던 메뉴 버튼으로 포커스를 돌려준다. 기존 How to play·Rules는 다시 추가하지 않는다.

- 2026-09-09: 메인 메뉴의 How to play·Rules 버튼과 실행 연결을 제거했다. Settings·음악 시작 안내·일시정지 창은 유지한다. 아래 튜토리얼 관련 설명과 소스는 보관용이며 현재 게임 진입점에서 불러오지 않는다.

- 게임 반응 체험판: `ui/styles/pickExperience.css`, `ui/feedback.ts`, `ui/talkApp.ts`. 기록은 `ui/pickRecords.ts`, 결과 표현은 `ui/pickResultView.ts`. `docs/EXPERIMENT-game-feel.md`에 기준 버전과 복구 절차를 기록했다. 게임 규칙은 변경하지 않았다.

- 음악: 재생기는 `ui/backgroundMusic.ts`, 화면별 음원 선택·중복 방지는 `ui/sceneMusic.ts`, 경로는 `config/app.ts`에 둔다. 현재 메뉴·메뉴에서 연 설정·How to play는 **Tap Parade**(`pick-tap-lobby.mp3`, 136 BPM·D장조·4/4박자·24마디·약 42.35초)를 사용한다. `scripts/generate-tap-lobby.mjs`가 합성 발끝·뒤꿈치 타격음과 피아노·워킹 베이스의 스윙을 생성한다. 실제 플레이는 기존 **Pick Garden**(100 BPM·C장조·4/4박자·38.4초)을 유지한다. 이전 왈츠 **Paper Lantern Waltz**와 92 BPM 메뉴 변주곡은 복구·연구용으로 보존한다. 기존 `scripts/generate-pick-music.mjs`의 `--menu`는 보관된 왈츠, `--legacy-menu`는 이전 변주곡, 옵션 없음은 게임곡을 재생성한다. 새 메뉴곡은 반드시 별도 탭 생성기를 사용한다.

- 음악 시작: 메뉴 음원을 미리 디코딩하고 인트로는 무음으로 유지한다. 첫 게임선택화면에서 `AudioContext.resume()`을 시도해 허용된 브라우저에서는 입력 없이 재생한다. 브라우저가 차단하면 500ms 뒤 메뉴 하단 **Tap for music**을 표시하며, 해당 버튼·로고 등 메뉴 영역의 터치나 키보드 입력으로 재시도한다. 게임에 들어갔다 나올 필요는 없다. 저장된 Music 꺼짐 설정을 우선하고, 일시정지·영상·결과·숨긴 탭에서는 중지한다. 공통 Music 켜기/끄기는 두 곡에 적용하며 효과음 설정과 독립이다. 자동 재생 차단은 우회하지 않는다. 상세 변경은 [첫 방문 음악 연구기록](research/2026-09-08-menu-autoplay/README.md)을 참고한다.

- 최신 안내: 첫 조각 연습은 3×3의 티피 정답 4조각과 다른 캐릭터 오답 5조각으로 구성한다. 개별 카드 크기는 이전 2×2와 동일하며 오답은 흔들림만 주고 진행하지 않는다. 정답 영역은 회색에서 컬러로 복원한다. 페어는 이미지 로딩 후 컬러로 3·2·1을 각 1초 표시한다. 완료 체크 없이 Next/Done으로 진행한다. 서체와 금색 맥동·흔들림은 TALK 안내 스타일을 참조한다.

- 체험형 How to play: `src/content/pickTutorial.ts`(예제·이미지), `src/core/pick/tutorial.ts`(연습 규칙·다음 대상), `src/ui/pickTutorial.ts`(버튼·표시). 상단 진행 점·Skip, 그림 중심 안내, 단일 컬러 강조 버튼, 완료 후 Next/Done을 사용합니다. 손가락·화살표·다시하기는 표시하지 않습니다. 페어 안내는 별도 제시 그림 없이 카드 이미지 로딩 후 2초간 앞면을 보여주고 가린 다음 빛나는 카드로 유도합니다. 화면 전환·닫기 시 미리보기 예약을 취소합니다. 연습은 본 게임과 상태·제한시간을 공유하지 않습니다. 화면 문구는 최소화하고 보조기기용 안내는 유지합니다.

- `src/content/puzzles.ts` — 캐릭터 이름, 폴더, PNG/JPG 연결
- `src/core/pick/game.ts` — 7×7·5×5·4×4 보드 생성, 셔플, 점수 규칙
- `src/ui/talkApp.ts` — 세 게임의 화면 흐름과 문구
- `src/ui/styles/talk.css` — 목표 카드, 이미지 블록, 메모리 카드 레이아웃
- `src/ui/styles/tokens.css` — TAPtoTALK에서 이어받은 색상과 한글 폰트
- `src/config/app.ts` — 앱 이름, 시작 화면 시간, 완료 영상과 음원

## 이미지 규칙

- 해피 당근 테스트: `Ha/carrot-original.png`는 제공 원본 보관본이다. `scripts/split-unit-image.cjs`로 여백을 추가해 비율을 보존한 960×960 완성 WebP와 320×320 조각 9장을 생성한다. 조각을 재조립해 완성 이미지와 픽셀 일치를 검사한다. `character("ha", "Hapee", "HapeeCarrot", true)`가 이를 연결하고 `UNIT_TRIAL_CHARACTER_ID = "ha"`로 게임 1에서 항상 제시한다. 다른 캐릭터 조각은 오답으로 유지한다. `showGrid`는 위쪽 제시 그림에만 CSS 구획선을 그린다. 이전 해피 PNG·JPG·WebP는 보관 중이다. 전체 무작위 선택은 `UNIT_TRIAL_CHARACTER_ID`를 `undefined`로, 옛 해피 이미지는 캐릭터 정의를 `character("ha", "Hapee", "Ha")`로 복원한다.
- 게임 2의 `core/pick/game.ts` → `RandomIndexCycle`은 앱 실행 동안 남은 캐릭터 순서를 보관한다. 매 묶음에 일곱 명을 한 번씩 섞고 묶음 사이 연속 중복을 막는다. `startMode`나 단계 진급에서는 초기화하지 않으며 페이지 새로고침 시에는 새 인스턴스로 시작한다. 오답·일시정지는 순서를 소비하지 않는다.

- 게임 1·2의 제시 그림 위 이름은 `content/puzzles.ts`의 공통 한글 이름 매핑과 `displayName`을 사용합니다(예: `재피 Zapee`). 게임 2는 새 문제마다 갱신하며 게임 3에서는 숨깁니다. 파일 경로와 캐릭터 ID는 표시 이름과 별개입니다.

- 각 캐릭터 폴더의 PNG는 완성 이미지로 사용합니다.
- JPG 파일은 정사각형 조각이어야 합니다.
- 파일 추가·교체 뒤에는 `npm run build`로 Vite가 모든 이미지를 포함하는지 확인합니다.
- 캐릭터 폴더를 추가하면 `src/content/puzzles.ts`의 glob 패턴과 캐릭터 목록을 함께 수정합니다.
- 게임 2는 일곱 캐릭터 얼굴의 정답과 바리에이션을 사용합니다. 런타임에는 `optimized/montage/` 아래 캐릭터별 폴더의 `answer.webp`, `variation-*.webp`를 불러옵니다.
- 게임 2의 `core/pick/montage.ts`는 2×2(3문제) → 3×3(5문제) → 4×4(5문제) → 5×5(5문제)의 진급·완료, 생명 보너스, 두 블록 교환과 문 닫기·열기 시간을 관리합니다. `planMontageSwap`은 서로 다른 그림 두 개만 교환하고 나머지는 보존합니다. UI는 완전히 가려진 구간에 DOM 순서를 변경하며 문 진행률을 게임 시간에 맞추므로 일시정지 시 문도 멈춥니다.
- `content/puzzles.ts`의 `MONTAGE_EXCLUDED`는 승인된 뒷모습·상하 반전 8개를 모든 단계와 프리로드에서 제외합니다. 원본 파일은 보관합니다. `MONTAGE_DIFFICULTY`는 원본과 비교해 검토한 바리에이션 파일 번호입니다. 첫 2×2는 색상만 바뀐 이미지·좌우 반전·3D 버전 대신 눈·입·머리·모자 등의 형태 변화만 사용하며, 후반은 작은 얼굴·장식 차이 이미지를 우선 사용합니다. 3×3 이후에는 제외된 8개 외의 기존 색상 바리에이션도 사용할 수 있습니다. 난이도 체감은 플레이 테스트 후 조정합니다.
- 게임 1·2는 제한시간 없이 `PickLives`로 생명을 관리합니다. 생명이 0이면 Game Over입니다. 게임 1 실패 영상은 `characterCelebrations.tepee`, 게임 2의 성공·실패 영상은 마지막 플레이 캐릭터를 사용합니다. 게임 2의 3×3 완료 보너스는 최대 5개까지 한 번만 회복합니다. 게임 1의 내부 경과시간은 성공 점수 계산에만 사용합니다.
- 게임 3은 `MEMORY_FACES`의 원본 얼굴 7종만 반복해 8·12·18·24쌍을 구성합니다. 게임 2의 최적화된 정답 얼굴(`answer.webp`)만 재사용하고 바리에이션은 제외합니다. `MEMORY_PREVIEW_MS`로 단계별 미리보기 시간을 설정합니다.
- 게임 3과 페어 튜토리얼의 카드 뒷면은 `src/ui/memoryQuestionIcon.ts`의 기본형 SVG 물음표를 공유합니다. 글꼴·외부 이미지 로딩에 의존하지 않으며 `.memory-question-icon`은 카드의 58%, 최대 52px로 표시합니다. 카드 버튼의 접근성 설명은 유지하고 아이콘 자체는 보조기기에 중복 낭독하지 않습니다.
- `src/core/pick/memory.ts`의 `MEMORY_STAGES`는 보드 크기·쌍 수·단계별 제한시간을 정의합니다. `MemoryRun`이 미리보기, 동일 이미지 매칭, 단계 전환, 시간 초과를 처리합니다. UI는 일시정지 중 시간을 전달하지 않아 타이머와 뒤집기 대기도 함께 멈춥니다.

## 의존 방향

```text
ui → content → core/pick
       ↑
     config
```

`core/pick`은 DOM, CSS, localStorage를 참조하지 않습니다. 규칙 변경에는 Vitest 테스트를 함께 추가합니다.
