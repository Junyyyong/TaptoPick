# 디자인과 콘텐츠 수정 경계

TAP to PICK은 TAPtoTALK의 화면 감각과 폰트를 유지하면서 이미지 게임 규칙을 독립적으로 관리합니다.

## 자주 수정할 곳

- `src/content/puzzles.ts` — 캐릭터 이름, 폴더, PNG/JPG 연결
- `src/core/pick/game.ts` — 7×7·5×5·4×4 보드 생성, 셔플, 점수 규칙
- `src/ui/talkApp.ts` — 세 게임의 화면 흐름과 문구
- `src/ui/styles/talk.css` — 목표 카드, 이미지 블록, 메모리 카드 레이아웃
- `src/ui/styles/tokens.css` — TAPtoTALK에서 이어받은 색상과 한글 폰트
- `src/config/app.ts` — 앱 이름, 시작 화면 시간, 완료 영상과 음원

## 이미지 규칙

- 각 캐릭터 폴더의 PNG는 완성 이미지로 사용합니다.
- JPG 파일은 정사각형 조각이어야 합니다.
- 파일 추가·교체 뒤에는 `npm run build`로 Vite가 모든 이미지를 포함하는지 확인합니다.
- 캐릭터 폴더를 추가하면 `src/content/puzzles.ts`의 glob 패턴과 캐릭터 목록을 함께 수정합니다.
- 게임 2는 일곱 캐릭터 얼굴의 정답과 바리에이션을 사용합니다. 런타임에는 `optimized/montage/` 아래 캐릭터별 폴더의 `answer.webp`, `variation-*.webp`를 불러옵니다.
- 게임 2의 `createMontageRound`는 정답 개수에 따라 3×3 → 4×4 → 5×5(이후 유지) 보드를 생성합니다.
- 게임 1·2는 제한시간 없이 `PICK_MISTAKE_LIMIT`(5회)과 `pickChances`로 오답 기회를 관리합니다. 다섯 번째 오답에 Game Over, 영상은 `characterCelebrations.tepee`로 고정합니다. 게임 1의 내부 경과시간은 성공 점수 계산에만 사용합니다.
- 게임 3은 `MEMORY_FACES`의 원본 얼굴 7종만 반복해 8·12·18·24쌍을 구성합니다. 게임 2의 최적화된 정답 얼굴(`answer.webp`)만 재사용하고 바리에이션은 제외합니다. `MEMORY_PREVIEW_MS`로 단계별 미리보기 시간을 설정합니다.
- `src/core/pick/memory.ts`의 `MEMORY_STAGES`는 보드 크기·쌍 수·단계별 제한시간을 정의합니다. `MemoryRun`이 미리보기, 동일 이미지 매칭, 단계 전환, 시간 초과를 처리합니다. UI는 일시정지 중 시간을 전달하지 않아 타이머와 뒤집기 대기도 함께 멈춥니다.

## 의존 방향

```text
ui → content → core/pick
       ↑
     config
```

`core/pick`은 DOM, CSS, localStorage를 참조하지 않습니다. 규칙 변경에는 Vitest 테스트를 함께 추가합니다.
