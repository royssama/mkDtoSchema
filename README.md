# mkDtoSchema

Java DTO 필드 선언에 Swagger `@Schema` 설명을 자동으로 붙이는 정적 HTML/JavaScript 도구입니다.

## 실행 방법

브라우저에서 `index.html` 파일을 열면 바로 사용할 수 있습니다. 별도 서버나 패키지 설치가 필요하지 않습니다.

## 사용 예시

입력:

```java
private String csNo;
private String appCd;
```

출력:

```java
@Schema(description = "CS번호", example = "")
private String csNo;
@Schema(description = "어플리케이션코드", example = "")
private String appCd;
```

## 단어장 수정

카멜케이스로 분리된 컬럼명 토큰은 `dictionary.js`에서 찾습니다.
기본 단어장에는 SCM/물류/재고/주문/결제/IT/API/웹/보안/사용자 관리와 반도체/디스플레이/제조 공정/장비에서 자주 쓰는 단어와 약어가 포함되어 있습니다.

예를 들어 `csNo`는 `cs` + `no`, `appCd`는 `app` + `cd`로 분리됩니다.
원하는 한글명이 없으면 `dictionary.js`에 아래처럼 추가하세요.

```javascript
myword: "내단어"
```
