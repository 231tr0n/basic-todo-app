package com.example.todo.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.todo.constants.Constants;
import com.example.todo.dtos.CreateUserDto;
import com.example.todo.dtos.UpdateUserDto;
import com.example.todo.entities.AuthorityEntity;
import com.example.todo.entities.UserEntity;
import com.example.todo.repositories.TodoRepository;
import com.example.todo.repositories.UserRepository;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.authentication.session.SessionAuthenticationException;
import org.springframework.web.context.request.RequestContextHolder;

class GlobalServiceSessionTest {
  private final UserRepository userRepository = mock(UserRepository.class);
  private final SessionCookieService sessionCookieService = mock(SessionCookieService.class);
  private final GlobalService service =
      new GlobalService(
          userRepository,
          mock(TodoRepository.class),
          new BCryptPasswordEncoder(),
          mock(AuthenticationManager.class),
          mock(JwtService.class),
          sessionCookieService);

  @AfterEach
  void clearContext() {
    SecurityContextHolder.clearContext();
    RequestContextHolder.resetRequestAttributes();
  }

  @Test
  void requiresAuthenticationForProtectedOperations() {
    assertThatThrownBy(service::getUsers).isInstanceOf(SessionAuthenticationException.class);
    assertThatThrownBy(service::signOut).isInstanceOf(SessionAuthenticationException.class);
  }

  @Test
  void signsOutWithoutARequestContext() {
    UserEntity user = authenticate();

    service.signOut();

    verify(userRepository).save(user);
    verifyNoInteractions(sessionCookieService);
    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
  }

  @Test
  void deletesTheCurrentUserWithoutARequestContext() {
    UserEntity user = authenticate();
    when(userRepository.findByIdAndFetchAuthorities(user.getId())).thenReturn(Optional.of(user));

    service.deleteUser(0);

    verify(userRepository).delete(user);
    verifyNoInteractions(sessionCookieService);
  }

  @Test
  void renamesTheCurrentUserWithoutARequestContext() {
    UserEntity user = authenticate();
    when(userRepository.findByIdAndFetchAuthorities(user.getId())).thenReturn(Optional.of(user));
    when(userRepository.findByUsername("alice-renamed")).thenReturn(Optional.empty());
    UpdateUserDto updateUserDto = new UpdateUserDto();
    updateUserDto.setUsername("alice-renamed");

    service.updateUser(0, updateUserDto);

    assertThat(user.getUsername()).isEqualTo("alice-renamed");
    verify(sessionCookieService, never()).generateSessionCookie(any(), anyString());
  }

  @Test
  void rejectsNullUsernamesAndForeignPrincipals() {
    CreateUserDto createUserDto = new CreateUserDto();
    createUserDto.setAuthorities(Set.of());

    assertThatThrownBy(() -> service.createUser(createUserDto))
        .isInstanceOf(NullPointerException.class);

    SecurityContextHolder.getContext()
        .setAuthentication(new UsernamePasswordAuthenticationToken("string", "password"));
    assertThatThrownBy(service::getUsers).isInstanceOf(SessionAuthenticationException.class);
  }

  @Test
  void keepsExistingAuthoritiesWithoutRefreshingTheSession() {
    UserEntity user = authenticate();
    user.getAuthorities()
        .add(AuthorityEntity.builder().authority(Constants.ADMIN_AUTHORITY).user(user).build());
    when(userRepository.findByIdAndFetchAuthorities(user.getId())).thenReturn(Optional.of(user));
    UpdateUserDto updateUserDto = new UpdateUserDto();
    updateUserDto.setAuthorities(Set.of(Constants.ADMIN_AUTHORITY));

    service.updateUser(0, updateUserDto);

    assertThat(user.getAuthorities())
        .extracting(AuthorityEntity::getAuthority)
        .containsExactly(Constants.ADMIN_AUTHORITY);
    verify(sessionCookieService, never()).generateSessionCookie(any(), anyString());
  }

  @Test
  void replacesAuthoritiesOfAnotherUser() {
    UserEntity admin = authenticate();
    admin
        .getAuthorities()
        .add(AuthorityEntity.builder().authority(Constants.ADMIN_AUTHORITY).user(admin).build());
    UserEntity target = UserEntity.builder().id(2).username("bob").password("password").build();
    target.getAuthorities().add(AuthorityEntity.builder().authority("MEMBER").user(target).build());
    when(userRepository.findByIdAndFetchAuthorities(target.getId()))
        .thenReturn(Optional.of(target));
    UpdateUserDto updateUserDto = new UpdateUserDto();
    updateUserDto.setAuthorities(Set.of(Constants.ADMIN_AUTHORITY));

    service.updateUser(target.getId(), updateUserDto);

    assertThat(target.getAuthorities())
        .extracting(AuthorityEntity::getAuthority)
        .containsExactly(Constants.ADMIN_AUTHORITY);
    verify(sessionCookieService, never()).generateSessionCookie(any(), anyString());
  }

  private static UserEntity authenticate() {
    UserEntity user = UserEntity.builder().id(1).username("alice").password("password").build();
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(user, "password", user.getAuthorities()));
    return user;
  }
}
