# 디자인과 콘텐츠 수정 경계

TAPtoTALK은 레이아웃을 다시 디자인해도 한글 규칙을 건드리지 않도록 나눕니다.

## Claude에서 주로 수정할 곳

- `index.html` — 화면의 HTML 구조와 접근성 레이블
- `src/ui/styles/tokens.css` — 색, 폰트, 간격, 그림자 등 디자인 토큰
- `src/ui/styles/*.css` — 화면별 레이아웃과 애니메이션
- `public/assets/brand/` — 로고, 시작 이미지, 완료 영상과 음원

## 디자인 작업에서 수정하지 않을 곳

- `src/core/hangul/` — 천지인 키 정의, 한글 조합, 문장 분해, 보드 생성
- `src/content/prompts.ts` — 문장 데이터와 자유 모드 설정

## 교체형 미디어

파일명과 경로를 유지하면 코드 변경 없이 자산만 바꿀 수 있습니다.

| 용도 | 파일 |
| --- | --- |
| 제목 로고 | `TAPtoTALK-logo.svg` |
| 첫 스튜디오 심볼 | `public/assets/brand/tapeetepee-open-talk.png` |
| 시작 화면 | `public/assets/brand/splash.webp` |
| 성공 영상 | `public/assets/brand/celebration.webm` |
| 성공 음원 | `public/assets/brand/celebration.mp3` |

완료 영상은 `src/config/app.ts`의 `CELEBRATION_MOVIES`에 등록합니다. 현재 `4`,
`1`, `4`, `taepi`, `hupi`, `haepi`, `jaepi` 여섯 묶음 중 하나가 성공할 때 무작위로
선택되고, 실패할 때는 `tipi`만 재생됩니다. 각 묶음은 일반·Android용 WebM, iPhone용 MP4, 동기화 음원 MP3로
구성합니다. 파일명에 한글을 사용하면 macOS와 Linux에서 유니코드 정규화 방식이
달라질 수 있으므로 미디어 파일명은 영문으로 유지합니다.

점수별 `compact`, `standard`, `large`, `hero` 레이아웃은
`src/ui/styles/overlay.css`에서 영상 너비와 상단·문구 간격을 따로 조절합니다.

경로 자체를 바꾸려면 `src/config/app.ts` 한 곳과, JavaScript가 실행되기 전 보이는
시작 이미지 두 군데(`index.html`)만 수정합니다.

## 의존 방향

```text
ui → content → core/hangul
       ↑
     config
```

`core/hangul`은 DOM이나 CSS를 참조하지 않습니다. 게임 규칙 테스트도 브라우저 없이 실행됩니다.

자음/모음/문장부호 타일의 색은 `talk.css`의 `.letter-tile--consonant`,
`.letter-tile--vowel`, `.letter-tile--punctuation`만 수정하면 됩니다.
