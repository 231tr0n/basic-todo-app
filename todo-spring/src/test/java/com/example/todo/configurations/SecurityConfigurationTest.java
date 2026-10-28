package com.example.todo.configurations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.example.todo.components.JwtAuthenticationFilterComponent;
import com.example.todo.entities.UserEntity;
import com.example.todo.repositories.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class SecurityConfigurationTest {
  private final UserRepository userRepository = mock(UserRepository.class);
  private final SecurityConfiguration configuration =
      new SecurityConfiguration(
          mock(JwtAuthenticationFilterComponent.class),
          userRepository,
          new TodoConfigurationProperties());

  @Test
  void authenticatesKnownUsers() {
    BCryptPasswordEncoder encoder = configuration.passwordEncoder();
    UserEntity user =
        UserEntity.builder().username("alice").password(encoder.encode("password")).build();
    when(userRepository.findByUsernameAndFetchAuthorities("alice")).thenReturn(Optional.of(user));
    AuthenticationProvider provider = configuration.authenticationProvider();

    Authentication authentication =
        provider.authenticate(new UsernamePasswordAuthenticationToken("alice", "password"));

    assertThat(authentication.isAuthenticated()).isTrue();
    assertThat(authentication.getPrincipal()).isSameAs(user);
  }

  @Test
  void rejectsUnknownUsers() {
    when(userRepository.findByUsernameAndFetchAuthorities("missing")).thenReturn(Optional.empty());
    AuthenticationProvider provider = configuration.authenticationProvider();

    assertThatThrownBy(
            () ->
                provider.authenticate(
                    new UsernamePasswordAuthenticationToken("missing", "password")))
        .isInstanceOf(BadCredentialsException.class);
  }
}
