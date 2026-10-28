package com.example.todo.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.todo.constants.Constants;
import com.example.todo.entities.AuthorityEntity;
import com.example.todo.entities.UserEntity;
import org.junit.jupiter.api.Test;
import org.springframework.security.authorization.AuthorizationDeniedException;

class GlobalServiceTest {
  @Test
  void recognizesUsersWithTheAdminAuthority() {
    UserEntity user = userWithAuthorities(Constants.ADMIN_AUTHORITY);

    assertThat(GlobalService.isAdmin(user)).isTrue();
    assertThatCode(() -> GlobalService.isAdminOrThrow(user)).doesNotThrowAnyException();
  }

  @Test
  void rejectsUsersWithoutTheAdminAuthority() {
    UserEntity user = userWithAuthorities("MEMBER");

    assertThat(GlobalService.isAdmin(user)).isFalse();
    assertThatThrownBy(() -> GlobalService.isAdminOrThrow(user))
        .isInstanceOf(AuthorizationDeniedException.class)
        .hasMessage("User is not authorized");
  }

  @Test
  void rejectsNullUsers() {
    assertThatThrownBy(() -> GlobalService.isAdmin(null)).isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> GlobalService.isAdminOrThrow(null))
        .isInstanceOf(NullPointerException.class);
  }

  private static UserEntity userWithAuthorities(String... authorities) {
    UserEntity user = UserEntity.builder().username("alice").build();
    for (String authority : authorities) {
      user.getAuthorities().add(AuthorityEntity.builder().authority(authority).user(user).build());
    }
    return user;
  }
}
