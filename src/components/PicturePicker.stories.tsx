import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { bonsaiPicture, scarfPicture } from "../stories/samplePictures.ts";
import { PicturePicker } from "./PicturePicker.tsx";

const meta = {
  title: "Wishlist/PicturePicker",
  component: PicturePicker,
  args: {
    pictures: [],
    max: 5,
    onAddFiles: fn(),
    onAddLink: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof PicturePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No pictures yet. "Add pictures" opens the phone's photos or camera. */
export const Empty: Story = {};

export const TwoPictures: Story = {
  args: {
    pictures: [
      { key: "a", src: bonsaiPicture },
      { key: "b", src: scarfPicture },
    ],
  },
};

/** At the limit: nothing more can be added. */
export const Full: Story = {
  args: {
    max: 2,
    pictures: TwoPictures.args!.pictures,
  },
};

/** Enter in the link field adds the link instead of saving the form. */
export const AddLink: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText(/link to a picture/i),
      "https://example.com/bike.jpg{Enter}",
    );
    await expect(args.onAddLink).toHaveBeenCalledWith("https://example.com/bike.jpg");
  },
};

/** Not a link: said next to the field. */
export const BadLink: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/link to a picture/i), "bike.jpg{Enter}");
    await expect(canvas.getByRole("alert")).toBeVisible();
  },
};
