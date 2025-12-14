package com.example.todo.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SignInDto {
  @NotNull
  @Size(min = 1, max = 255)
  private String username;

  @NotNull
  @Size(min = 1, max = 255)
  private String password;
}
