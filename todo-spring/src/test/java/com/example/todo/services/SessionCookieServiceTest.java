package com.example.todo.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.todo.configurations.TodoConfigurationProperties;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SessionCookieServiceTest {
  private final TodoConfigurationProperties properties = configuration();
  private final SessionCookieService service = new SessionCookieService(properties);

  @Test
  void writesAConfiguredSessionCookie() {
    MockHttpServletResponse response = new MockHttpServletResponse();

    service.generateSessionCookie(response, "token-value");

    assertThat(response.getHeader("Set-Cookie"))
        .contains("token=token-value", "HttpOnly", "Path=/", "Max-Age=120", "SameSite=Strict")
        .doesNotContain("Secure");
  }

  @Test
  void honoursTheCookieSecurityConfiguration() {
    properties.getCookie().setSecure(true);
    properties.getCookie().setHttpOnly(false);
    properties.getCookie().setName("session");
    properties.getCookie().setPath("/app");
    properties.getCookie().setSameSite("Lax");
    MockHttpServletResponse response = new MockHttpServletResponse();

    service.generateSessionCookie(response, "token-value");

    assertThat(response.getHeader("Set-Cookie"))
        .contains("session=token-value", "Path=/app", "SameSite=Lax", "Secure")
        .doesNotContain("HttpOnly");
  }

  @Test
  void deletesTheCookieWithZeroMaxAge() {
    MockHttpServletResponse response = new MockHttpServletResponse();

    service.deleteSessionCookie(response);

    assertThat(response.getHeader("Set-Cookie")).contains("token=", "Max-Age=0");
  }

  @Test
  void readsAnExistingCookie() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setCookies(new Cookie("token", "abc"));

    assertThat(service.getSessionCookie(request))
        .get()
        .extracting(Cookie::getValue)
        .isEqualTo("abc");
  }

  @Test
  void returnsEmptyWhenTheCookieIsMissing() {
    assertThat(service.getSessionCookie(new MockHttpServletRequest())).isEmpty();
  }

  @Test
  void rejectsNullArguments() {
    assertThatThrownBy(() -> service.generateSessionCookie(null, "value"))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> service.generateSessionCookie(new MockHttpServletResponse(), null))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> service.deleteSessionCookie(null))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> service.getSessionCookie(null))
        .isInstanceOf(NullPointerException.class);
  }

  private static TodoConfigurationProperties configuration() {
    TodoConfigurationProperties properties = new TodoConfigurationProperties();
    properties.getJwt().setSecret("test-secret");
    properties.getJwt().setExpiry(120);
    return properties;
  }
}
