package com.example.todo.dtos;

import jakarta.validation.constraints.Size;
import java.util.Optional;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateUserDto {
  private Optional<@Size(min = 1, max = 255) String> username;
  private Optional<@Size(min = 0, max = 10) Set<String>> authorities;
}
