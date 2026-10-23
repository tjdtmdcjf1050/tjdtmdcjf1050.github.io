# 기존 GROW BOOK 원본의 GitHub 이관

대상 사이트: https://grow-book.tjdtmdcjf1050.chatgpt.site/
원본 프로젝트: appgprj_6a5590accf288191a6059d732cdeb83f
이관 기준 소스 커밋: 5757c6477e4c5696b7b6393bfbe6c37fc75641c8

## 이관 내용

기존 사이트 소스 저장소의 추적 파일 165개를 경로, 내용, 실행 권한을 보존해 복사했다. React/Vinext 앱, API, CSS, 이미지, 폰트, 데이터베이스 스키마 및 마이그레이션, 테스트와 로컬 실행 스크립트가 포함된다. 기존 앱 구조와 디자인을 임의로 바꾸지 않았다.

이전에 이 GitHub 저장소에 작성했던 별도 정적 첫 화면 및 css/grow-book.css, js/grow-book.js, IMPLEMENTATION.md는 제거했다. Git 이력은 유지된다.

## GitHub Pages와 앱 실행

이 원본은 Cloudflare Workers 런타임과 D1(DB), R2(BUCKET)를 사용하는 서버 앱이다. GitHub Pages는 정적 파일 호스팅만 제공하므로 앱 서버와 API를 실행할 수 없다.

루트 index.html은 기존 사이트로 이동시키는 진입 페이지다. GitHub 주소로 방문해도 기존 GROW BOOK을 이용하지만, 사이트를 실행하는 호스팅은 기존 chatgpt.site다. iframe이나 새 디자인으로 대체하지 않았다.

GitHub 자체에 소스는 보관되며, 독립 호스팅을 하려면 별도의 Workers 런타임, DB, 파일 저장소와 환경변수를 구성해야 한다. DB 레코드, 업로드 파일, 운영 환경변수 및 인증 세션은 이관하지 않았다. 기존 도메인의 로그인 세션과 데이터는 기존 호스팅에서 유지된다.

## 실행 및 검증

원본 README.md와 LOCAL_TEST_GUIDE_KO.md를 참고한다. 이 작업은 원본 소스의 복사이므로 프레임워크와 라이브러리를 재작성하거나 제거하지 않는다. 소스와 자산의 Git blob SHA를 원본과 비교해 검증한다. 새 환경에서 앱 전체 빌드와 기능 테스트를 완료했다는 의미는 아니다.

.dev.vars.example은 원본의 로컬 개발 예시이며 운영 비밀번호가 아니다. 운영 환경에는 별도 비밀값이 필요하다. 실제 .env, .dev.vars, 로컬 DB, 토큰은 복사하지 않는다.
