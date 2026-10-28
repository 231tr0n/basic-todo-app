package com.example.todo.dtos;

import jakarta.validation.constraints.Size;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserDto {
  @Size(min = 1, max = 255)
  private String username;

  @Size(max = 10)
  private Set<String> authorities;
}
