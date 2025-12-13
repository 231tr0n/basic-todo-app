package com.example.todo.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SignInDto {
  @NotNull private String username;
  @NotNull private String password;
}
