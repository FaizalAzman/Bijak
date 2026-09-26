import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts } from '@/theme';
import { Txt } from './Txt';

export function Field({ label, ...props }: TextInputProps & { label?: string }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt variant="label">{label}</Txt> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        onFocus={(e) => {
          setFocus(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          props.onBlur?.(e);
        }}
        style={[
          {
            borderWidth: 2,
            borderColor: colors.ink,
            borderRadius: 14,
            backgroundColor: focus ? colors.paper : '#FFFBF2',
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontFamily: fonts.bold,
            fontSize: 17,
            color: colors.ink,
            boxShadow: focus ? `3px 3px 0px ${colors.lime}` : undefined,
          },
          props.style,
        ]}
      />
    </View>
  );
}
