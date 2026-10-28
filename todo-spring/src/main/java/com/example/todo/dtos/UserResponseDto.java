package com.example.todo.dtos;

import com.example.todo.entities.UserEntity;
import java.util.Comparator;
import java.util.List;

public record UserResponseDto(long id, String username, List<String> authorities) {
  public static UserResponseDto from(UserEntity user) {
    return new UserResponseDto(
        user.getId(),
        user.getUsername(),
        user.getAuthorities().stream()
            .map(authority -> authority.getAuthority())
            .sorted(Comparator.naturalOrder())
            .toList());
  }
}
