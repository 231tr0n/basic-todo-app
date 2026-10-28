package com.example.todo.components;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.example.todo.entities.UserEntity;
import com.example.todo.repositories.UserRepository;
import com.example.todo.services.JwtService;
import com.example.todo.services.SessionCookieService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class JwtAuthenticationFilterComponentTest {
  private final JwtService jwtService = mock(JwtService.class);
  private final UserRepository userRepository = mock(UserRepository.class);
  private final SessionCookieService sessionCookieService = mock(SessionCookieService.class);
  private final JwtAuthenticationFilterComponent filter =
      new JwtAuthenticationFilterComponent(jwtService, userRepository, sessionCookieService);

  @AfterEach
  void clearContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void continuesWithoutACookie() throws Exception {
    when(sessionCookieService.getSessionCookie(any())).thenReturn(Optional.empty());
    FilterChain chain = mock(FilterChain.class);

    filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), chain);

    verify(chain).doFilter(any(), any());
    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
  }

  @Test
  void authenticatesAnEnabledUser() throws Exception {
    UserEntity user =
        UserEntity.builder().id(1).username("alice").password("password").loggedOut(false).build();
    when(sessionCookieService.getSessionCookie(any()))
        .thenReturn(Optional.of(new Cookie("token", "jwt")));
    when(jwtService.decodeJwt("jwt")).thenReturn("alice");
    when(userRepository.findByUsernameAndFetchAuthorities("alice")).thenReturn(Optional.of(user));
    FilterChain chain = mock(FilterChain.class);

    filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), chain);

    assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal())
        .isSameAs(user);
    verify(chain).doFilter(any(), any());
  }

  @Test
  void skipsRequestsThatAreAlreadyAuthenticated() throws Exception {
    UserEntity user = UserEntity.builder().username("alice").build();
    SecurityContextHolder.getContext()
        .setAuthentication(new UsernamePasswordAuthenticationToken(user, "password"));
    FilterChain chain = mock(FilterChain.class);

    filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), chain);

    verifyNoInteractions(sessionCookieService);
    verify(chain).doFilter(any(), any());
  }

  @Test
  void clearsTheSessionForInvalidTokens() throws Exception {
    when(sessionCookieService.getSessionCookie(any()))
        .thenReturn(Optional.of(new Cookie("token", "jwt")));
    when(jwtService.decodeJwt(anyString())).thenThrow(new JWTVerificationException("invalid"));
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(new MockHttpServletRequest(), response, mock(FilterChain.class));

    verify(sessionCookieService).deleteSessionCookie(response);
    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
  }

  @Test
  void clearsTheSessionForDisabledUsers() throws Exception {
    UserEntity user =
        UserEntity.builder().username("alice").password("password").enabled(false).build();
    when(sessionCookieService.getSessionCookie(any()))
        .thenReturn(Optional.of(new Cookie("token", "jwt")));
    when(jwtService.decodeJwt("jwt")).thenReturn("alice");
    when(userRepository.findByUsernameAndFetchAuthorities("alice")).thenReturn(Optional.of(user));
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(new MockHttpServletRequest(), response, mock(FilterChain.class));

    verify(sessionCookieService).deleteSessionCookie(response);
    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
  }
}
