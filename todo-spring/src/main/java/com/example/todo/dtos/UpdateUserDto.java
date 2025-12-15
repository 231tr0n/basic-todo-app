package com.example.todo.dtos;

import jakarta.validation.constraints.Size;
import java.util.Set;
import lombok.Data;

@Data
public class UpdateUserDto {
  @Size(min = 1, max = 255)
  private String username;

  @Size(min = 1, max = 10)
  private Set<String> authorities;
}
